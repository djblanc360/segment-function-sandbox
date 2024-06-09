/**
 * Handle incoming HTTP request
 *
 * @param  {FunctionRequest} request
 * @param  {FunctionSettings} settings
 * @param {ServerRequest} request The incoming webhook request
 * @param {Object.<string, any>} settings Custom settings
 */
 async function onRequest(request, settings) {
	const { state, ...rest } = request.json();
	const shopDomain = request.headers.get('x-shopify-shop-domain');
	// DETERMINE HARD ID, PRIORITIZE EMAIL OVER CUSTOMER ID, PRIORITIZE CUSTOMER ID OVER PHONE
	const hardId = rest => {
		const { id, email, phone } = rest;
		const value =  email.toLowerCase() || id || phone;
    	return String(value)
	};

	const disabled = state === 'disabled' ? true : false;
	if (disabled) {
		const commonProps = await generateCommonProps({
			state,
			domain: shopDomain,
			...rest
		});
		
		Segment.identify({
			userId: hardId(rest),
			traits: commonProps
		});

		Segment.track({
			event: 'customer_disabled',
			userId: hardId(rest),
			properties: commonProps
		});
	}

}

//---------------------------------------------------------------------
//                        HELPERS
//---------------------------------------------------------------------

const generateCommonProps = async ({ state, domain, ...rest }) => ({
	state,
	domain,
	...rest
});
