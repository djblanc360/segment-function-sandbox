const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Read Test Source Function
fs.readFile('./json-sources/order_update/refund_item-olukai-dev.json', 'utf8', (err, data) => {
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
async function onRequest(request, settings) {
	// FOR TESTING
	// request = JSON.parse(request)
	// const { order_status_url, refunds, ...rest } = request.order

	// const headers = request.headers
	// console.log('headers', headers)
	// const order_status_url = headers.get('X-Shopify-Shop-Domain')
	// For Deployement
	const { order_status_url, refunds, ...rest } = request.json();

	// For Source Code Compiler
	// const eventBody = request.json();
	// const { order_status_url, refunds, ...rest } = eventBody.order;

	const email = rest.customer.email;
	console.log('email', email);
	const urlObject = new URL(order_status_url);
	const host = urlObject.hostname;
	console.log('host', host);

	// DETERMINE HARD ID, PRIORITIZE EMAIL OVER CUSTOMER ID, PRIORITIZE CUSTOMER ID OVER PHONE
	const hardId = rest => {
		const { id, email, phone } = rest.customer;
		return email || id || phone;
	}
	

	// CONDITONAL FOR TESTING ON PRODUCTION
	const testEmail = email => {
		let pass;
		switch (email) {
			case 'dblancaflor@olukai.com':
			case 'jcatacutan@olukai.com':
			case '@datacop':
			case '@chiefdigitaladvisors':
			case '@segment':
				pass = true;
				break;
			default:
				pass = false;
		}

		return pass;
	};

	// const testing = testEmail(email); // enabling this filters emails for testing
	const testing = true; // enabling this removes email filter for events
	const refunded = rest => {
		const { financial_status } = rest;
		return financial_status === 'refunded' || financial_status === 'partially_refunded'
			? true
			: false;
	}
	if (testing && refunded) {
		// CONDITONAL FOR TESTING ON PRODUCTION
		// const shopDomain = request.headers.get('x-shopify-shop-domain'); // header doesn't exist
		const shopDomain = host;
		// the last or only object in the array is the most recent refund
		const last_refund = refunds[refunds.length - 1];
		const commonProps = await generateCommonProps({
			domain: shopDomain,
			order_status_url,
			financial_status,
			refunds: last_refund,
			...rest
		});

		// REFUND EVENT
		Segment.track({
			event: 'refund',
			userId: String(hardId),
			properties: commonProps
		});

		// REFUND ITEM EVENT
		let total = 0;

		const line_items = last_refund.refund_line_items;
		for (const line_item of line_items) {
			const lineItemProps = {
				...line_item
			};
			total += 1;
			const payload = {
				order: {
					...commonProps
				},
				item: {
					...lineItemProps
				}
			};

			Segment.track({
				event: 'refund_item',
				userId: String(hardId),
				properties: payload
			});
		}
		console.log('total refund_item events', total);

		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'Events processed successfully.' })
		};
	} // CONDITONAL FOR TESTING ON PRODUCTION
}

//---------------------------------------------------------------------
//                        HELPERS
//---------------------------------------------------------------------

const generateCommonProps = async ({
	domain,
	last_refund,
	order_status_url,
	financial_status,
	...rest
}) => ({
	domain,
	order_status_url,
	financial_status,
	last_refund,
	...rest
});
