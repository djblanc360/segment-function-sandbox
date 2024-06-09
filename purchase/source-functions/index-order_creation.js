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
	// const { id, line_items, ...rest } = request.order

	// For Deployement
	const { line_items, ...rest } = request.json();
	const shopDomain = request.headers.get('x-shopify-shop-domain');

	// For Source Code Compiler
	// const shopDomain = 'olukai-store-dev.myshopify.com'
	// const eventBody = request.json();
	// const { line_items, ...rest } = eventBody.order;

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

	if (testing) {
		// CONDITONAL FOR TESTING ON PRODUCTION
		// const shopDomain = request.headers.get('x-shopify-shop-domain'); // header doesn't exist
		const commonProps = await generateCommonProps({
			domain: shopDomain,
			line_items: line_items,
			...rest
		});

		Segment.track({
			event: 'purchase',
			userId: hardId(rest),
			properties: commonProps
		});
		let total = 0;
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
				event: 'purchase_item',
				userId: hardId(rest),
				properties: payload
			});
		}
		console.log('total purchase_item events', total);

		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'Events processed successfully.' })
		};
	} // CONDITONAL FOR TESTING ON PRODUCTION
}

//---------------------------------------------------------------------
//                        HELPERS
//---------------------------------------------------------------------

const generateCommonProps = async ({ domain, line_items, ...rest }) => ({
	domain,
	line_items,
	...rest
});
