
async function onRequest(request, settings) {
	// FOR TESTING
	// request = JSON.parse(request)
	// const { id, email, ...rest } = request.order

	// const headers = request.headers
	// console.log('headers', headers)
	// For Deployement
	const { subtotal_price, note, refunds, ...rest } = request.json();

	// For Source Code Compiler
	// const eventBody = request.json();
	// const { id, email, subtotal_price, note, refunds, ...rest } = eventBody.order;

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

	const isExchange = (subtotal_price, note) => {
		let subtotal = parseFloat(subtotal_price);
		subtotal= Math.round(subtotal); 
		return subtotal !== 0 
		? true 
		: (note.includes('Return for exchange') && !note.includes('Return for refund')) 
			? true 
			: false;
	};

	// const testing = testEmail(email); // enabling this filters emails for testing
	const testing = true; // enabling this removes email filter for events
	const exchanged = isExchange(subtotal_price, note);
	if (testing && exchanged) {
		// CONDITONAL FOR TESTING ON PRODUCTION
		// const shopDomain = request.headers.get('x-shopify-shop-domain'); // header doesn't exist
		// the last or only object in the array is the most recent exchange
		const last_exchange = refunds[refunds.length - 1];
		const commonProps = await generateCommonProps({
			domain: shopDomain,
			subtotal_price,
			note,
			refunds: last_exchange,
			...rest
		});

		// EXCHANGE EVENT
		Segment.track({
			event: 'exchange',
			userId: String(rest.customer.id),
			properties: commonProps
		});

		// EXCHANGE ITEM EVENT
		let total = 0;

		const line_items = last_exchange.refund_line_items;
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
	domain,
	last_exchange,
	subtotal_price,
	note,
	...rest
}) => ({
	domain,
	last_exchange,
	subtotal_price,
	note,
	...rest
});
