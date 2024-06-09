// Learn more about destination functions API at
// https://segment.com/docs/connections/destinations/destination-functions
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Read Test Source Function
fs.readFile('./json-sources/order.json', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
	// console.log(data)
    // Parse the JSON data
    let jsonData = JSON.stringify(data);
    // Do something with the JSON data
    // console.log(jsonData);
    onRequest(data, {});
  });
  
  async function onRequest(request, settings) {
    console.log('request', request)
    console.log('settings', settings)
	// const eventBody = request.json();
	// const { id, email, line_items, ...rest } = eventBody.order;
	const { id, email, line_items, ...rest } = request.json();
	const shopDomain = request.headers.get('x-shopify-shop-domain');
	const commonProps = await generateCommonProps({
		id,
		email: email.toLowerCase(),
		domain: shopDomain,
		line_items: line_items,
		...rest
	});

    // for testing
    const segment = {
        event: 'purchase',
		userId: String(rest.customer.id),
		properties: commonProps
    }

	// Segment.track({
	// 	event: 'purchase',
	// 	userId: String(rest.customer.id),
	// 	properties: commonProps
	// });
    console.log('segment', segment)

	for (const line_item of line_items) {
		const lineItemProps = {
			...line_item
		};

		const payload = {
			order: {
				...commonProps
			},
			item: {
				...lineItemProps
			}
		};
        // for testing
        const segmentItem = {
            event: 'purchase_item',
            userId: String(rest.customer.id),
            properties:  payload
        }
		// Segment.track({
		// 	event: 'purchase_item',
		// 	userId: String(rest.customer.id),
		// 	properties: payload
		// });
        console.log('segmentItem', segmentItem)
	}

	return {
		statusCode: 200,
		body: JSON.stringify({ message: 'Events processed successfully.' })
	};
}

//---------------------------------------------------------------------
//                        HELPERS
//---------------------------------------------------------------------

const generateCommonProps = async ({ id, email, ...rest }) => ({
	id,
	email,
	...rest
});
