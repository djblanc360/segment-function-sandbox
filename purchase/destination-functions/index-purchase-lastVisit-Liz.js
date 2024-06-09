
// Learn more about destination functions API at
// https://segment.com/docs/connections/destinations/destination-functions
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { credentials, domainActions } = require('../../config');

// Read Test Source Function
fs.readFile('./json-sources/purchase-CANADA.json', 'utf8', (err, data) => {
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
	const eventName = 'purchase';
	if (event.event === 'purchase') {
		//---------------------------------------------------------------------
		//                        Payload Properties
		//---------------------------------------------------------------------
		// const domain = event.properties.domain;
		const { domain, key, secret, token } = credentials[event.properties.domain];

		const headers = await getDomainHeaders(domain);
		const customerEmail = event.properties.customer.email;
		//---------------------------------------------------------------------
		//                        Order Properties
		//---------------------------------------------------------------------
		// let eventName = event.event;

		const orderProps = await generateCommonProps(event, domain, headers);
		// console.log('properties', properties);

		//---------------------------------------------------------------------
		//                        Line Item Properties
		//---------------------------------------------------------------------

		const itemProps = await generateItemProps(
			orderProps,
			event.properties.line_items,
			domain,
			headers
		);

		// 	//---------------------------------------------------------------------
		// 	//                       Purchase Initilization
		// 	//---------------------------------------------------------------------

		const properties = await generateTotalProps(orderProps, itemProps);
		console.log('properties', properties);
		// console.log('properties stringify', JSON.stringify(properties));

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

		// console.log('DATA:', requestOptions);
		// console.log('DATA OBJECT:', JSON.parse(requestOptions.body));

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

const getVariantOptionsByVariantId = async (variantId, domain, headers) => {
	console.log('getProuctTagsByProductId variantId', variantId);

	let graphql = JSON.stringify({
		query: `{
			node(id: "gid://shopify/ProductVariant/${variantId}") {
				... on ProductVariant {
				  title
				  selectedOptions {
					name
					value
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
		.then(result => result.data.node.selectedOptions)
		.catch(error => console.log(error));
	// .then(result => result.data.product.tags)
	// .then(result => console.log(result))

	return response;
};

const getLastVisit = async (orderId, domain, headers) => {
	try {
		console.log('getLastVisit', orderId, domain, headers);

		const graphql = JSON.stringify({
			query: `{
				order(id: "gid://shopify/Order/${orderId}") {
					customerJourneySummary {
					  daysToConversion
					  firstVisit {
						...visit
					  }
					  lastVisit {
						...visit
					  }
					  momentsCount
					  moments(first: 1, reverse: true) {
						nodes {
						  ...visit
						}
					  }
					}
				  }
			}
			fragment visit on CustomerVisit {
			landingPage
			source
			sourceType
			referrerUrl
			referralCode
			referralInfoHtml
			utmParameters {
				campaign
				content
				medium
				source
				term
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

		console.log('getLastVisit - domain:', domain);
		console.log('getLastVisit - requestOptions:', requestOptions);
		console.log(
			`getLastVisit - url: https://${domain}/admin/api/2023-04/graphql.json`
		);

		// `https://${domain}/admin/api/graphql.json`,
		const response = await fetch(
			`https://${domain}/admin/api/2023-04/graphql.json`,
			requestOptions
		);

		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}
		const data = await response.json();
		console.log('successfully retrieved getLastVisit data: ', data);
		console.log(
			'getLastVisit - customerJourneySummary: ',
			data.data.order.customerJourneySummary
		);
		// .then(response => response.json())
		// .then(result => result.data.order.customerJourneySummary)
		// .catch(error => console.log(error));
		// .then(result => result.data.product.tags)
		// .then(result => console.log(result))

		return data.data.order.customerJourneySummary;
	} catch (error) {
		console.error(`Could not retrieve customerJourneySummary: ${error}`);
	}
};

// handle issue with null values in object
const handleLastVisit = async (lastVisit, domain) => {
	let last_visit_location;
	let last_visit_path;
	let last_visit_referrer;
	let last_visit_site_source;
	let last_visit_utm_campaign;
	let last_visit_utm_medium;
	let last_visit_utm_source;
	let last_visit_utm_term;
	console.log('lastVisit', lastVisit);
	if (lastVisit !== null) {
		last_visit_location =
			lastVisit.landingPage !== null ? lastVisit.landingPage : '';
		console.log('line 171: ', lastVisit.landingPage);
		last_visit_path =
			lastVisit.landingPage !== null
				? lastVisit.landingPage.split('https://')[1].replace(domain, '')
				: '';
		last_visit_referrer =
			last_visit_referrer !== null ? lastVisit.referrerUrl : '';
		last_visit_site_source =
			last_visit_site_source !== null ? lastVisit.source : '';

		if (lastVisit.utmParameters !== null) {
			last_visit_utm_campaign =
				lastVisit.utmParameters.campaign !== null
					? lastVisit.utmParameters.campaign
					: '';
			last_visit_utm_medium =
				lastVisit.utmParameters.medium !== null
					? lastVisit.utmParameters.medium
					: '';
			last_visit_utm_source =
				lastVisit.utmParameters.source !== null
					? lastVisit.utmParameters.source
					: '';
			last_visit_utm_term =
				lastVisit.utmParameters.term !== null
					? lastVisit.utmParameters.term
					: '';
		} else {
			last_visit_utm_campaign = '';
			last_visit_utm_medium = '';
			last_visit_utm_source = '';
			last_visit_utm_term = '';
		}
	} else {
		last_visit_location = '';
		last_visit_path = '';
		last_visit_referrer = '';
		last_visit_site_source = '';
		last_visit_utm_campaign = '';
		last_visit_utm_medium = '';
		last_visit_utm_source = '';
		last_visit_utm_term = '';
	}
	console.log('line 455: last_visit_location', last_visit_location);
	console.log('last_visit_path', last_visit_path);
	console.log('last_visit_referrer', last_visit_referrer);
	console.log('last_visit_site_source', last_visit_site_source);
	console.log('last_visit_utm_campaign', last_visit_utm_campaign);
	console.log('last_visit_utm_medium', last_visit_utm_medium);
	console.log('last_visit_utm_source', last_visit_utm_source);
	console.log('last_visit_utm_term', last_visit_utm_term);  
	return {
		last_visit_location: last_visit_location,
		last_visit_path: last_visit_path,
		last_visit_referrer: last_visit_referrer,
		last_visit_site_source: last_visit_site_source,
		last_visit_utm_campaign: last_visit_utm_campaign,
		last_visit_utm_medium: last_visit_utm_medium,
		last_visit_utm_source: last_visit_utm_source,
		last_visit_utm_term: last_visit_utm_term
	};
}
//---------------------------------------------------------------------
//                        GENERATE PROPERTIES
//---------------------------------------------------------------------

const generateCommonProps = async (event, domain, headers) => {
	let discount_applications = event.properties.discount_applications;
	let discount_exists = true;
	if (
		discount_applications === undefined ||
		discount_applications.length == 0
	) {
		discount_exists = false;
	}

	let last_visit_location,
	last_visit_path,
	last_visit_referrer,
	last_visit_site_source,
	last_visit_utm_campaign,
	last_visit_utm_medium,
	last_visit_utm_source,
	last_visit_utm_term
let lastVisit 

const journeySummary = await getLastVisit(
	event.properties.id,
	domain,
	headers
)
.then((response) => {
	lastVisit = response.moments.nodes[0];
	const {
		last_visit_location,
		last_visit_path,
		last_visit_referrer,
		last_visit_site_source,
		last_visit_utm_campaign,
		last_visit_utm_medium,
		last_visit_utm_source,
		last_visit_utm_term
	} = handleLastVisit(lastVisit, domain);



console.log('lastVisit - ', lastVisit);

	let gateway_granular = '';
	if (event.properties.payment_details.credit_card_company !== undefined) {
		gateway_granular = event.properties.payment_details.credit_card_company;
	}
	var properties = {
		billing_address_city: event.properties.billing_address.city,
		billing_address_country: event.properties.billing_address.country,
		billing_address_country_code: event.properties.billing_address.country_code,
		billing_address_province: event.properties.billing_address.province,
		billing_address_province_code:
			event.properties.billing_address.province_code,
		buyer_accepts_marketing: event.properties.customer.accepts_marketing,
		cart_token: event.properties.cart_token,
		checkout_id: event.properties.checkout_id,
		checkout_token: event.properties.checkout_token,
		compare_at_price_total:
			event.properties.subtotal_price_set.presentment_money.amount,
		compare_at_price_total_usd:
			event.properties.subtotal_price_set.shop_money.amount,
		confirmed: event.properties.confirmed,
		created_at: convertToUnixTime(event.properties.created_at),
		currency: event.properties.currency,
		customer_email: event.properties.customer.email,
		customer_id: event.properties.customer.id,
		discount_applications: event.properties.discount_applications,
		discount_code: discount_exists
			? event.properties.discount_applications[0].title
			: '',
		discount_description: discount_exists
			? event.properties.discount_applications[0].description
			: '',
		discount_title: discount_exists
			? event.properties.discount_applications[0].title
			: '',
		discount_type: discount_exists
			? event.properties.discount_applications[0].type
			: '',
		discount_value: discount_exists
			? event.properties.discount_applications[0].value
			: '',
		discount_value_type: discount_exists
			? event.properties.discount_applications[0].value_type
			: '',
		domain: event.properties.domain,
		gateway: event.properties.gateway,
		gateway_granular: gateway_granular,
		landing_site: event.properties.landing_site ?? '',
		landing_site_ref: event.properties.referring_site ?? '',
		last_visit_location: last_visit_location,
		last_visit_path: last_visit_path,
		last_visit_referrer: last_visit_referrer,
		last_visit_site_source: last_visit_site_source,
		last_visit_utm_campaign: last_visit_utm_campaign,
		last_visit_utm_medium: last_visit_utm_medium,
		last_visit_utm_source: last_visit_utm_source,
		last_visit_utm_term: last_visit_utm_term,
		name: event.properties.name,
		note: event.properties.note ?? '',
		number: event.properties.number,
		order_number: event.properties.order_number,
		order_status_url: event.properties.order_status_url ?? '',
		presentment_currency: event.properties.presentment_currency,
		processed_at: event.properties.processed_at,
		processing_method: event.properties.processing_method,
		purchase_id: event.properties.id,
		quantity: getTotalQuantity(event.properties.line_items),
		shipping_address_city: event.properties.shipping_address.city,
		shipping_address_country: event.properties.shipping_address.country,
		shipping_address_country_code:
			event.properties.shipping_address.country_code,
		shipping_address_postal_code: event.properties.shipping_address.zip,
		shipping_address_province: event.properties.shipping_address.province,
		shipping_address_province_code:
			event.properties.shipping_address.province_code,
		shipping_address_street: event.properties.shipping_address.address1,
		shopify_traffic_source: event.properties.source_identifier ?? '',
		source: event.properties.domain,
		source_name: event.properties.source_name,
		subtotal_price: removeDecimalIfZero(event.properties.subtotal_price),
		subtotal_price_usd: removeDecimalIfZero(
			event.properties.subtotal_price_set.shop_money.amount
		),
		tags: event.properties.tags,
		timestamp: convertToUnixTime(event.timestamp),
		test: event.properties.test,
		token: event.properties.token,
		total_discounts: removeDecimalIfZero(event.properties.total_discounts),
		total_discounts_usd: removeDecimalIfZero(event.properties.total_discounts),
		total_line_items_price: removeDecimalIfZero(
			event.properties.total_line_items_price
		),
		total_line_items_price_usd: removeDecimalIfZero(
			event.properties.total_line_items_price_set.shop_money.amount
		),
		total_price: removeDecimalIfZero(event.properties.total_price),
		total_price_usd: removeDecimalIfZero(
			event.properties.total_price_set.shop_money.amount
		),
		total_shipping: removeDecimalIfZero(
			event.properties.total_shipping_price_set.presentment_money.amount
		),
		total_shipping_usd: removeDecimalIfZero(
			event.properties.total_shipping_price_set.shop_money.amount
		),
		total_tax: removeDecimalIfZero(event.properties.total_tax),
		total_tax_usd: removeDecimalIfZero(
			event.properties.total_tax_set.presentment_money.amount
		),
		total_weight: event.properties.total_weight,
		updated_at: convertToUnixTime(event.properties.updated_at)
	};

	// properties = removeNullValues(properties);
	return properties;


})
return journeySummary;
console.log('journeySummary - ', journeySummary);
}


const generateItemProps = async (order, lineItems, domain, headers) => {
	// console.log('order', order);
	// properties = {};
	const lineItemProps = await Promise.all(
		lineItems.map(async item => {
			// console.log('item', item);
			// console.log('item', item);

			properties = {};
			properties.id = item.id;
			properties.grams = item.grams;
			properties.name = item.name;
			properties.price = item.price;
			properties.product_id = item.product_id;
			properties.quantity = item.quantity;
			properties.requires_shipping = item.requires_shipping;
			properties.sku = item.sku;
			properties.title = item.title;
			properties.variant_id = item.variant_id;
			properties.variant_title = item.variant_title;
			properties.vendor = item.vendor;
			properties.item_material = item.item_material;
			properties.item_style = item.item_style;

			// add tag specific properties
			console.log('product_id', item.product_id);
			const productTags = await getProuctTagsByProductId(
				item.product_id,
				domain,
				headers
			);

			// Find tag and return value
			function findTagValue(tags, prefix) {
				let tag = tags.find(tag => tag.startsWith(prefix));
				if (tag) return tag.slice(prefix.length);
				return null;
			}
			typeof productTags !== 'undefined'
				? console.log('its valid', productTags)
				: console.log('its NOT valid');
			properties.item_gender =
				typeof productTags !== 'undefined'
					? findTagValue(productTags, 'gender:')
					: '';
			properties.item_category_generic =
				typeof productTags !== 'undefined'
					? findTagValue(productTags, 'cat:')
					: '';
			properties.item_material =
				typeof productTags !== 'undefined'
					? findTagValue(productTags, 'material:')
					: '';

			properties.item_style =
				typeof productTags !== 'undefined'
					? findTagValue(productTags, 'style:')
					: '';

			// get line item options (size/color)
			const optionValuesByTitle = {};
			const variantOptions = await getVariantOptionsByVariantId(
				item.variant_id,
				domain,
				headers
			);
			variantOptions.forEach(option => {
				const title = option.name;
				const value = option.value;
				optionValuesByTitle[title] = value;
			});
			properties.item_color =
				typeof variantOptions !== 'undefined'
					? optionValuesByTitle['Color']
					: '';
			properties.item_size =
				typeof variantOptions !== 'undefined'
					? optionValuesByTitle['Size']
					: '';

			return properties;
		})
	);

	console.log('lineItemProps', lineItemProps);
	// return properties;
	return lineItemProps;
};

// final structure of props
const generateTotalProps = async (common, items) => {
	const properties = {
		...common,
		line_items: items
	};
	return properties;
};
