/**
 * Handle incoming HTTP request
 *
 * @param  {FunctionRequest} request
 * @param  {FunctionSettings} settings
 * @param {ServerRequest} request The incoming webhook request
 * @param {Object.<string, any>} settings Custom settings
 */
 async function onRequest(request, settings) {
	const { ...rest } = request.json();
	const shopDomain = request.headers.get('x-shopify-shop-domain');

	// DETERMINE HARD ID, PRIORITIZE EMAIL OVER CUSTOMER ID, PRIORITIZE CUSTOMER ID OVER PHONE
	const hardId = rest => {
		const { id, email, phone } = rest;
		const value =  email.toLowerCase() || id || phone;
    	return String(value)
	};

	const enabled = state === 'enabled' ? true : false;
	if (enabled) {
		const commonProps = await generateCommonProps({
			domain: shopDomain,
			...rest
		});
	
		Segment.identify({
			userId: hardId(rest),
			traits : commonProps
		  });
	  
		Segment.track({
			event: ' customer_enabled',
			userId: hardId(rest),
			properties: commonProps
		});
	}
}

//---------------------------------------------------------------------
//                        HELPERS
//---------------------------------------------------------------------

const generateCommonProps = async ({ domain, ...rest }) => ({
	domain,
	...rest
});
