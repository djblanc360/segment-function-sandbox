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

	const commonProps = await generateCommonProps({
		domain: shopDomain,
		...rest
	});

	// const extractedTraits = extractTraits(commonProps);

	Segment.identify({
		userId: hardId(rest),
	  	traits : commonProps
	});
	// removed extractedTraits from traits
  
	Segment.track({
		event: 'customer_creation',
		userId: hardId(rest),
		properties: commonProps
	});
}

//---------------------------------------------------------------------
//                        HELPERS
//---------------------------------------------------------------------

const generateCommonProps = async ({ domain, ...rest }) => ({
	domain,
	...rest
});

/**
 * extractTraits
 * - helper function to return available traits
 */

 function extractTraits(commonProps) {
	/**
	 * define trait keys to pluck
	 */
	const keysToExtract = [
		'first_name',
		'last_name',
		'email',
		'phone',
		'id',
		'state',
		'tax_exempt',
		'created_at',
		'updated_at',
		'default_address2',
		'default_address_state',
		'default_country_name',
		'default_country_code',
		'default_company',
		'default_country',
		'default_city',
		'currency',
		'tags',
		'domain',
		'note',
		'verified_email',
		'accepts_marketing_updated_at',
		'marketing_opt_in_level',
		'accepts_marketing',
		'tax_exempt'
	];
  
	/**
	 * extract desired values 
	 */
  
	const extractedTraits = {};
  
	for (const key of keysToExtract) {
	  if (commonProps.hasOwnProperty(key)) {
		extractedTraits[key] = commonProps[key];
	  }
	}
  
	/**
	 * return keys with values
	 */
  
	return _.omitBy(extractedTraits, _.isNil);
  };