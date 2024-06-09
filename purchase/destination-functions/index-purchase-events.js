// Learn more about destination functions API at
// https://segment.com/docs/connections/destinations/destination-functions
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { credentials, domainActions } = require('../../config');

// Read Test Source Function
fs.readFile('./json-sources/purchase_item.json', 'utf8', (err, data) => {
    if (err) {
      console.error(er/r);
      return;
    }
  
    // Parse the JSON data
    const jsonData = JSON.parse(data);
  
    // Do something with the JSON data
    // console.log(jsonData);
    onTrack(jsonData, {});
});
// Learn more about destination functions API at
// https://segment.com/docs/connections/destinations/destination-functions

/**
 * Handle track event
 * @param  {SegmentTrackEvent} event
 * @param  {FunctionSettings} settings
 */

 async function onTrack(event, settings) {

	const eventName = event.event;

	// retrieve domain and request headers for graphql functions
	const domain = event.properties.order.domain;
	const headers = await getDomainHeaders(domain);

	let properties = await generateCommonProps(
		event,
		domain,
		headers
	);

	if (event.event === 'purchase_item') {
		console.log('purchase_item');
		const itemProps = await generateItemProps(
			event.properties.order,
			event.properties.item,
			domain,
			headers
		);
		properties = Object.assign(properties, itemProps);
	}
	
	if (event.event === 'purchase') {
        console.log('purchase');
		properties = await generateTotalProps(event);
		properties = Object.assign(properties, properties);
	}
	

	const { key, secret, token } = credentials[domain];
	const auth = `${key}:${secret}`;
	const url =
		'https://api.exponea.com/track/v2/projects/' + token + '/customers/events';

	const payload = {
		customer_ids: {
			email_id: event.properties.order.email
		},
		event_type: eventName,
		properties: properties
	};
	// console.log('PAYLOAD:', payload);

	const requestOptions = {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`${auth}`).toString('base64')}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(payload)
	};
	// console.log('DATA:', requestOptions);

	const response = await fetch(url, requestOptions)
		.then(response => response.json())
		.then(result => {
			console.log('Success:', result);
			return result;
		})
		.catch(error => error);

	return response;
}

//---------------------------------------------------------------------
//                        HELPERS
//---------------------------------------------------------------------

function checkForNullValues(jsonObject) {
	const nullValues = [];

	for (let key in jsonObject) {
		if (jsonObject[key] === null) {
			nullValues.push(key);
		} else if (typeof jsonObject[key] === 'object') {
			// recursive call to check for null values in nested objects
			const nestedNullValues = checkForNullValues(jsonObject[key]);
			if (nestedNullValues.length > 0) {
				nullValues.push(
					...nestedNullValues.map(nestedKey => `${key}.${nestedKey}`)
				);
			}
		}
	}
	return nullValues;
}

const removeNullValues = obj => {
	for (let key in obj) {
		const value = obj[key];
		if (value === null || value === undefined || value === '') {
			delete obj[key];
		} else if (typeof value === 'object') {
			removeNullValues(value);
		}
	}
	return obj;
}

const convertToUnixTime = date => {
	return Math.floor(new Date(date).getTime() / 1000);
}

const getTotalQuantity = items => {	// NOT USED FOR SINGLE ITEM PURCHASE
    return items.reduce((total, item) => total + item.quantity, 0);
}

//---------------------------------------------------------------------
//                        HELPERS - GRAPHQL
//---------------------------------------------------------------------

// get request header from domain
const getDomainHeaders = async domain => {
  let reqHeaders = { 'Content-Type': 'application/json' }
  
  if (domain in domainActions) {
    reqHeaders['X-Shopify-Access-Token'] = domainActions[domain]()
  }
  
  return reqHeaders;
}

const getProuctTagsByProductId = async (productId, domain, headers) => {

	let graphql = JSON.stringify({
		query: `{
			product(id: "gid://shopify/Product/${productId}") {
			tags
			}
		}`,
		variables: {}
	});
	console.log('getProuctTagsByProductId reqHeaders', headers)

	let requestOptions = {
		method: 'POST',
		headers: headers,
		body: graphql
	};
	// `https://${domain}/admin/api/graphql.json`,
	let response = await fetch(
		`https://${domain}/admin/api/2023-04/graphql.json`,
		requestOptions
	)
		.then(response => response.json())
		.then(result => result.data.product.tags)
		.catch(error => console.log(error));
	// .then(result => result.data.product.tags)
	// .then(result => console.log(result))

	return response;
};

const getLastVisit = async (orderId, domain, headers) => {
	console.log('getLastVisit', orderId, domain, headers);

	let graphql = JSON.stringify({
		query: `{
			order(id: "gid://shopify/Order/${orderId}") {
				customerJourneySummary {
					firstVisit {
						id
						landingPage
						referralCode
						referralInfoHtml
						referrerUrl
						source
						sourceDescription
						sourceType
						utmParameters {
							campaign
							source
							term
							medium
						}
					}
					lastVisit {
						id
						landingPage
						referralCode
						referralInfoHtml
						referrerUrl
						source
						sourceDescription
						sourceType
						utmParameters {
							campaign
							source
							term
							medium
						}
					}
				}
			}
		}`,
		variables: {}
	});

	let requestOptions = {
		method: 'POST',
		headers: headers,
		body: graphql
	};
	// `https://${domain}/admin/api/graphql.json`,
	let response = await fetch(
		`https://${domain}/admin/api/2023-04/graphql.json`,
		requestOptions
	)
		.then(response => response.json())
		.then(result => result.data.order.customerJourneySummary)
		.catch(error => console.log(error));
	// .then(result => result.data.product.tags)
	// .then(result => console.log(result))

	return response;
}

//---------------------------------------------------------------------
//                        GENERATE PROPERTIES
//---------------------------------------------------------------------
