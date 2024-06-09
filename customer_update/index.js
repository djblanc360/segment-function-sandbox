const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { credentials, domainActions } = require('../../config');

// Read Test Source Function
fs.readFile('./destination-payloads/customer_update.json', 'utf8', (err, data) => {
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

async function onTrack(event, settings) {
	if (event.event === 'customer_update') {
		const eventName = 'customer_update';
		const { domain, key, secret, token } =
			credentials[event.properties.shopDomain];
		const headers = await getDomainHeaders(domain);
		const customerEmail = event.properties.email;
		const properties = await generateCommonProps(event, domain, headers);
        console.log('properties', properties);
        
		const auth = `${key}:${secret}`;
		const endpoint =
			'https://api.exponea.com/track/v2/projects/' +
			token +
			'/customers/events';
		const payload = {
			customer_ids: {
				email_id: customerEmail
			},
			event_type: eventName,
			properties: properties
		};
		const requestOptions = {
			method: 'POST',
			headers: {
				Authorization: `Basic ${Buffer.from(`${auth}`).toString('base64')}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(payload)
		};
		const response = await fetch(endpoint, requestOptions)
			.then(response => response.json())
			.then(result => {
				console.log('Success:', result);
				return result;
			})
			.catch(error => error);
		return response;
	}
	return false;
}

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

function removeNullValues(obj) {
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

function convertToUnixTime(date) {
	return Math.floor(new Date(date).getTime() / 1000);
}

function getTotalQuantity(items) {
	return items.reduce((total, item) => total + item.quantity, 0);
}

function removeDecimalIfZero(decimal) {
	let str = decimal.toString();

	if (str.endsWith('.00')) {
		return parseInt(decimal, 10);
	}

	return decimal;
}

const getDomainHeaders = async domain => {
  let reqHeaders = { 'Content-Type': 'application/json' }
  
  if (domain in domainActions) {
    reqHeaders['X-Shopify-Access-Token'] = domainActions[domain]()
  }
  
  return reqHeaders;
}

const getConversionRate = async (orderId, domain, headers) => {
	try {
		console.log('getConversionRate', orderId, domain, headers);

		const graphql = JSON.stringify({
			query: `{
				order(id: "gid://shopify/Order/${orderId}") {
					currencyCode
					total_price
					total_price_usd
				  }
			}
			`,
			variables: {}
		});

		const requestOptions = {
			method: 'POST',
			headers: headers,
			body: graphql
		};

		// console.log('getConversionRate - domain:', domain);
		// console.log('getConversionRate - requestOptions:', requestOptions);
		// console.log(
		// 	`getConversionRate - url: https://${domain}/admin/api/2023-04/graphql.json`
		// );

		// `https://${domain}/admin/api/graphql.json`,
		const response = await fetch(
			`https://${domain}/admin/api/2023-04/graphql.json`,
			requestOptions
		);

		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}
		const data = await response.json();
		console.log('successfully retrieved getConversionRate data: ', data);
		// console.log(
		// 	'getLastVisit - customerJourneySummary: ',
		// 	data.data.order.customerJourneySummary
		// );
		// .then(response => response.json())
		// .then(result => result.data.order.customerJourneySummary)
		// .catch(error => console.log(error));
		// .then(result => result.data.product.tags)
		// .then(result => console.log(result))

		return data.data;
	} catch (error) {
		console.error(`Could not retrieve customerJourneySummary: ${error}`);
	}
};

const generateCommonProps = async (event, domain, headers) => {
	// const conversionRate = await getConversionRate(
	// 	event.properties.id,
	// 	domain,
	// 	headers
	// );
	// console.log('conversionRate', conversionRate);
	var properties = {
		accepts_marketing: event.properties.accepts_marketing,
		accepts_marketing_updated_at: event.properties.accepts_marketing_updated_at,
        // browser: event.properties.browser,
		created_at: convertToUnixTime(event.properties.created_at),
		currency: event.properties.currency,
        // device: event.properties.device,
		default_address1: event.properties.default_address.address1,
		default_address2: event.properties.default_address.address2,
		default_city: event.properties.default_address.city,
		default_company: event.properties.default_address.company,
		default_country: event.properties.default_address.country,
		default_country_code: event.properties.default_address.country_code,
		default_country_name: event.properties.default_address.country_name,
        // default_address_state: event.properties.default_address.state,
		domain: event.properties.domain,
		email: event.properties.email,
		first_name: event.properties.first_name,
		id: event.properties.id,
        // language: event.properties.language,
		last_name: event.properties.last_name,
        // location: event.properties.location,
		marketing_opt_in_level: event.properties.marketing_opt_in_level,
		note: event.properties.note,
        // os: event.properties.os,
        // page_load_ms: event.properties.page_load_ms,
		phone: event.properties.phone,
        // screen_height: event.properties.screen_height,
		// screen_resolution: event.properties.screen_resolution,
		// screen_width : event.properties.screen_width ,
		state: event.properties.state,
		tags: event.properties.tags,
		tax_exempt: removeDecimalIfZero(event.properties.tax_exempt),
		updated_at: convertToUnixTime(event.properties.updated_at),
		verified_email: event.properties.verified_email
	};
	return properties;
};
