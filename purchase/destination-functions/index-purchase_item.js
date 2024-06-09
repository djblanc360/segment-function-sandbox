const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { credentials, domainActions } = require('../../config');

// Read Test Source Function
fs.readFile('./json-sources/purchase_item-olukai-dev.json', 'utf8', (err, data) => {
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

	if (event.event === 'purchase_item') {
		// retrieve domain and request headers for graphql functions
		// const domain = event.properties.order.domain;
		const { domain, key, secret, token } =
			credentials[event.properties.order.domain];

		const hardId = (event) => {
			const { id, email, phone } = event.properties.order.customer;
			const key = email ? 'email_id' : id ? 'registered' : 'phone_id';
			const value = email || id || phone;
			return  { [key]: String(value) }
		}

		const headers = await getDomainHeaders(domain);

		let properties = await generateCommonProps(event, domain, headers);

		const itemProps = await generateItemProps(
			event.properties.order,
			event.properties.item,
			domain,
			headers
		);
		properties = Object.assign(properties, itemProps);
		// properties = removeNullValues(properties);
		console.log('properties:', properties);

		const auth = `${key}:${secret}`;
		const url =
			'https://api.exponea.com/track/v2/projects/' +
			token +
			'/customers/events';

		const payload = {
			customer_ids: hardId(event),
			event_type: eventName,
			properties: properties,
			timestamp: properties.created_at.toString()
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
	return false;
}

const getDestinationCredentials = async domain => {
	if (credentials[domain]) {
		console.log('CREDENTIALS:', credentials[domain]);
		return {
			key: credentials[domain].key,
			secret: credentials[domain].secret,
			token: credentials[domain].token
		};
		// return credentials[domain];
	} else {
		return null;
	}
};
//---------------------------------------------------------------------
//                        HELPERS
//---------------------------------------------------------------------

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
};

const convertToUnixTime = date => {
    dateString = date.substring(0, date.lastIndexOf("-"));
    return Math.floor(new Date(dateString).getTime() / 1000);
}

const convertToUTCTime = dateString => {
	// Parse the input date string
	const inputDate = new Date(dateString);
	// Get the UTC time in milliseconds since January 1, 1970
	const utcTime = inputDate.getTime() + (inputDate.getTimezoneOffset() * 60000);
	// Create a new Date object with the UTC time
	const utcDate = new Date(utcTime);
	// Return the UTC date string
	return utcDate.toISOString();
  }
  

const getTotalQuantity = items => {
	// NOT USED FOR SINGLE ITEM PURCHASE
	return items.reduce((total, item) => total + item.quantity, 0);
}

// handle issue with null values in object
function handleLastVisit(lastVisit, domain) {
	let last_visit_location;
	let last_visit_path;
	let last_visit_referrer;
	let last_visit_site_source;
	let last_visit_utm_campaign;
	let last_visit_utm_medium;
	let last_visit_utm_source;
	let last_visit_utm_term;

	if (lastVisit !== null) {
		last_visit_location =
			lastVisit.landingPage !== null ? lastVisit.landingPage : '';
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

function removeDecimalIfZero(decimal) {
	console.log('removeDecimalIfZero - decimal', decimal);
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
	console.log('getProuctTagsByProductId domain', domain);
	console.log('getProuctTagsByProductId productId', productId);

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
	console.log('getLastVisit', orderId, domain, headers);

	let graphql = JSON.stringify({
		query: `{
			order(id: "gid://shopify/Order/${orderId}") {
				customerJourneySummary {
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
};

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

	console.log('generateCommonProps domain', domain);

	var properties = {
		billing_address_city: event.properties.order.billing_address.city,
		billing_address_country: event.properties.order.billing_address.country,
		billing_address_country_code:
			event.properties.order.billing_address.country_code,
		billing_address_province: event.properties.order.billing_address.province,
		billing_address_province_code:
			event.properties.order.billing_address.province_code,
		buyer_accepts_marketing: event.properties.order.customer.accepts_marketing,
		cart_token: event.properties.order.cart_token,
		checkout_id: event.properties.order.checkout_id,
		checkout_token: event.properties.order.checkout_token,
		compare_at_price_total:
			event.properties.order.subtotal_price_set.presentment_money.amount,
		confirmed: event.properties.order.confirmed,
		created_at: convertToUTCTime(event.properties.order.created_at),
		currency: event.properties.order.currency,
		customer_email: event.properties.order.customer.email,
		customer_id: event.properties.order.customer.id,
		discount_applications: event.properties.order.discount_applications,
		discount_code: discount_exists
			? event.properties.order.discount_applications[0].title
			: '',
		discount_description: discount_exists
			? event.properties.order.discount_applications[0].description
			: '',
		discount_title: discount_exists
			? event.properties.order.discount_applications[0].title
			: '',
		discount_type: discount_exists
			? event.properties.order.discount_applications[0].type
			: '',
		discount_value: discount_exists
			? event.properties.order.discount_applications[0].value
			: '',
		discount_value_type: discount_exists
			? event.properties.order.discount_applications[0].value_type
			: '',
		domain: domain,
		gateway: event.properties.order.gateway,
		id: event.properties.order.id,
		landing_site: event.properties.order.landing_site,
		landing_site_ref: event.properties.order.referring_site ?? '',
		location_id: event.properties.order.source_name,
		name: event.properties.order.name,
		note: event.properties.order.note ?? '',
		number: event.properties.order.number,
		order_number: event.properties.order.order_number,
		order_status_url: event.properties.order.order_status_url ?? '',
		presentment_currency: event.properties.order.presentment_currency,
		processed_at: convertToUnixTime(event.properties.order.processed_at),
		processing_method: event.properties.order.processing_method,
		purchase_id: event.properties.order.id,
		shipping_address_city: event.properties.order.shipping_address.city,
		shipping_address_country: event.properties.order.shipping_address.country,
		shipping_address_country_code:
			event.properties.order.shipping_address.country_code,
		shipping_address_postal_code: event.properties.order.shipping_address.zip,
		shipping_address_province: event.properties.order.shipping_address.province,
		shipping_address_province_code:
			event.properties.order.shipping_address.province_code,
		shipping_address_street: event.properties.order.shipping_address.address1,
		source: event.properties.order.domain,
		source_name: event.properties.order.source_name,
		// subtotal_price: removeDecimalIfZero(event.properties.order.subtotal_price),
		test: event.properties.order.test,
		token: event.properties.order.token,
		total_discounts: removeDecimalIfZero(
			event.properties.order.total_discounts
		),
		// total_line_items_price: removeDecimalIfZero(
		// 	event.properties.order.total_line_items_price
		// ),
		// total_price: removeDecimalIfZero(event.properties.order.total_price),
		total_shipping: 0,
		// total_tax: removeDecimalIfZero(event.properties.order.total_tax),
		total_weight: event.properties.order.total_weight,
		updated_at: convertToUnixTime(event.properties.order.updated_at)
	};

	// properties = removeNullValues(properties);
	return properties;
};

const generateItemProps = async (order, item, domain, headers) => {

	// const lineItem = lineItems.find(item => item.id === product_id);
	// console.log("lineItem", lineItem);
	
	// let totalQuantity = getTotalQuantity(order.line_items); // (CANT USE) total quantity of order
	let itemQuantity = parseFloat(item.quantity);
	// let totalDiscounts = parseFloat(order.total_discounts) / parseFloat(totalQuantity);
	let itemDiscounts = parseFloat(item.total_discounts);
	// let totalShipping = parseFloat(order.total_shipping_price_set.presentment_money.amount) / parseFloat(totalQuantity);
	let itemShipping = 0; // should be 0 for individual items

	let totalPriceOrder = parseFloat(order.subtotal_price) + parseFloat(order.total_shipping) + parseFloat(order.total_tax);
	let totalLineItemsPrice = parseFloat(item.price) * itemQuantity;

	let subtotalPrice = totalLineItemsPrice - itemDiscounts;
	let totalTax = totalPriceOrder / subtotalPrice * parseFloat(order.total_tax);
	let totalPrice = subtotalPrice + totalTax + itemShipping;
	
	const event_id = `${order.id}_${item.sku}_${item.title}_${item.variant_title}_${item.id}`;

	// Removed the map function and use the lineItem directly
	// const item = lineItem;
	// console.log('item - ', item);
	properties = {};
	// (properties.event_id = order.id ?? ''),
	// properties.id = item.id;
	properties.event_id = event_id;
	properties.grams = item.grams;
	properties.line_item_name = item.name;
	properties.price = removeDecimalIfZero(item.price);
	properties.quantity = item.quantity;
	properties.product_id = item.product_id;
	properties.requires_shipping = item.requires_shipping;
	properties.sku = item.sku;
	properties.subtotal_price = removeDecimalIfZero(subtotalPrice);
	properties.title = item.title;
	properties.total_line_items_price = removeDecimalIfZero(totalLineItemsPrice);
	properties.total_price = removeDecimalIfZero(totalPrice);
	properties.total_tax = removeDecimalIfZero(totalTax);
	properties.variant_id = item.variant_id;
	properties.variant_title = item.variant_title;
	properties.vendor = item.vendor;

	// add tag specific properties
	console.log('product_id', item.product_id);

	const productTags = await getProuctTagsByProductId(
		item.product_id,
		domain,
		headers
	);
	// Find tag and return value
	function findTagValue(tags, prefix) {
		//
		let tag = tags.find(tag => tag.startsWith(prefix));
		if (tag) return tag.slice(prefix.length);
		return null;
	}
	typeof productTags !== 'undefined'
		? console.log('its valid', productTags)
		: console.log('its NOT valid');
	properties.item_category_generic =
		typeof productTags !== 'undefined' ? findTagValue(productTags, 'cat:') : '';
	properties.item_gender =
		typeof productTags !== 'undefined'
			? findTagValue(productTags, 'gender:')
			: '';
	properties.item_material =
		typeof productTags !== 'undefined'
			? findTagValue(productTags, 'material:')
			: '';

	let variant = item.variant_title;
	let title = item.title;
	let split1 = variant.split(' /').shift();
	let split2 = title.split(` - ${split1}`).shift();
	console.log(split2);
	// properties.item_style =
	// 	typeof productTags !== 'undefined'
	// 		? findTagValue(productTags, 'style:')
	// 		: '';
	properties.item_style = split2;

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
		typeof variantOptions !== 'undefined' ? optionValuesByTitle['Color'] : '';
	properties.item_size =
		typeof variantOptions !== 'undefined' ? optionValuesByTitle['Size'] : '';

	return properties;
};

// final structure of props
const generateTotalProps = async (common, items) => {
	const properties = {
		...common,
		line_items: items
	};
	return properties;
};
