async function onRequest(request, settings) {
	const { id, email, ...rest } = request.json();
	const shopDomain = request.headers.get('x-shopify-shop-domain');
	const customer = await getCustomerIdByOrderId(
		rest.order_id,
		shopDomain,
		settings
	);
	const commonProps = await generateCommonProps({
		id,
		email: customer.email.toLowerCase(),
		domain: shopDomain,
		...rest
	});

	Segment.track({
		event: 'refund',
		userId: customer.id.replace('gid://shopify/Customer/', ''),
		properties: commonProps
	});
}

//---------------------------------------------------------------------
//                        HELPERS
//---------------------------------------------------------------------

const generateCommonProps = async ({ id, email, domain, ...rest }) => ({
	id,
	email,
	domain,
	...rest
});

/**
  Returns the customer ID associated with a given order ID.
  @async
  @function
  @param {string} orderId - The ID of the order to look up.
  @param {object} settings - An object containing Shopify API credentials.
  @param {string} settings.shopifyApiTokenUs - The API token for Shopify.
  @returns {Promise<string>} The customer ID associated with the order ID.
  @throws {Error} If there is an error during the fetch request.
*/

const getCustomerIdByOrderId = async (orderId, domain, settings) => {
	let reqHeaders = new Headers();
	if (domain in domainActions) {
		reqHeaders['X-Shopify-Access-Token'] = domainActions[domain]();
	}
	reqHeaders.append('Content-Type', 'application/json');

	let graphql = JSON.stringify({
		query: `{
      order(id: "gid://shopify/Order/${orderId}") {
        customer {
          id
          email
        }
      }
    }`,
		variables: {}
	});

	let requestOptions = {
		method: 'POST',
		headers: reqHeaders,
		body: graphql
	};

	let response = await fetch(
		`https://${domain}/admin/api/graphql.json`,
		requestOptions
	)
		.then(response => response.json())
		.then(result => result.data.order.customer)
		.catch(error => error);

	return response;
};
