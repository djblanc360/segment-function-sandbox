/**
 * Handle incoming HTTP request
 *
 * @param  {FunctionRequest} request
 * @param  {FunctionSettings} settings
 * @param {ServerRequest} request The incoming webhook request
 * @param {Object.<string, any>} settings Custom settings
 */
async function onRequest(request, settings) {
	// FOR TESTING
	// request = JSON.parse(request)
	// const { financial_status, refunds, ...rest } = request.order

	// const headers = request.headers
	// console.log('headers', headers)
	// For Deployement
	const { financial_status, refunds, ...rest } =
		request.json();
	const shopDomain = request.headers.get('x-shopify-shop-domain');

	// For Source Code Compiler
	// const shopDomain = 'olukai-store-dev.myshopify.com'
	// const eventBody = request.json();
	// const { financial_status, refunds, ...rest } = eventBody.order;

	const email = rest.customer.email;
	console.log('email', email);

	// DETERMINE HARD ID, PRIORITIZE EMAIL OVER CUSTOMER ID, PRIORITIZE CUSTOMER ID OVER PHONE
	const hardId = rest => {
		const { id, email, phone } = rest;
		const value =  email.toLowerCase() || id || phone;
    	return String(value)
	};
	
	
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
	const refunded =
		financial_status === 'refunded' || financial_status === 'partially_refunded'
			? true
			: false;
	if (testing && refunded) {
		// CONDITONAL FOR TESTING ON PRODUCTION
		// const shopDomain = request.headers.get('x-shopify-shop-domain'); // header doesn't exist
		// the last or only object in the array is the most recent refund
		const last_refund = refunds[refunds.length - 1];
		const commonProps = await generateCommonProps({
			domain: shopDomain,
			financial_status,
			refunds: last_refund,
			...rest
		});

		// REFUND EVENT
		Segment.track({
			event: 'refund',
			userId: hardId(rest),
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
				userId: hardId(rest),
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
	financial_status,
	...rest
}) => ({
	domain,
	financial_status,
	last_refund,
	...rest
});
