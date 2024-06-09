async function onRequest(request, settings) {
	// FOR TESTING
	// request = JSON.parse(request)
	// const { id, line_items, ...rest } = request.order

	// For Deployement
	const { id, email, order_status_url, tags, fulfillments, ...rest } =
		request.json();

	// For Source Code Compiler
	// const eventBody = request.json();
	// const { id, email, order_status_url, tags, fulfillments, ...rest } = eventBody.order;

	console.log('email', email);
	const urlObject = new URL(order_status_url);
	const host = urlObject.hostname;
	console.log('host', host);

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
	
	const testing = testEmail(email);
	const exchanged = tags.includes('HappyReturns');
	console.log('exchanged', exchanged)

	if (testing && exchanged) {
		// CONDITONAL FOR TESTING ON PRODUCTION
		// const shopDomain = request.headers.get('x-shopify-shop-domain');
		const shopDomain = host;
		const fulfillment = fulfillments[fulfillments.length - 1];
		const commonProps = await generateCommonProps({
			id,
			email,
			domain: shopDomain,
			order_status_url,
			tags,
			fulfillments,
			...rest
		});

		Segment.track({
			event: 'exchange',
			userId: String(rest.customer.id),
			properties: commonProps
		});
		let total = 0;
		for (const line_item of fulfillment.line_items) {
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
				event: 'exchange_item',
				userId: String(rest.customer.id),
				properties: payload
			});
		}
		console.log('total exchange_item events', total);

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
	id,
	email,
	domain,
	order_status_url,
	tags,
	fulfillments,
	...rest
}) => ({
	id,
	email,
	domain,
	order_status_url,
	tags,
	fulfillments,
	...rest
});

