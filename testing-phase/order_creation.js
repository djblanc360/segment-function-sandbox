async function onRequest(request, settings) {
	// FOR TESTING
	// request = JSON.parse(request)
	// const { id, line_items, ...rest } = request.order

	// For Deployement
	const { id, email, line_items, ...rest } = request.json();

	// For Source Code Compiler
	// const eventBody = request.json();
	// const { id, line_items, ...rest } = eventBody.order;

  // CONDITONAL FOR TESTING ON PRODUCTION
  const testEmail = (email) => {
    let pass;
    switch(email) {
        case "dblancaflor@olukai.com":
        case "jcatacutan@olukai.com":
        case "@datacop":
        case "@chiefdigitaladvisors":
        case "@segment":
            pass = true;
            break;
        default:
           pass = false;
    }

    return pass;
}

  const testing = testEmail(email)
  if (testing) { // CONDITONAL FOR TESTING ON PRODUCTION
		const shopDomain = request.headers.get('x-shopify-shop-domain');
		const commonProps = await generateCommonProps({
			id,
			domain: shopDomain,
			line_items: line_items,
			...rest
		});

		Segment.track({
			event: 'purchase',
			userId: String(rest.customer.id),
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
				userId: String(rest.customer.id),
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

const generateCommonProps = async ({ id, domain, line_items, ...rest }) => ({
	id,
	domain,
	line_items,
	...rest
});
