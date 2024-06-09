async function onRequest(request, settings) {
	const { ...rest } = request.json();
	const shopDomain = request.headers.get('x-shopify-shop-domain');
	const commonProps = await generateCommonProps({
		domain: shopDomain,
		...rest
	});

	Segment.track({
		event: 'customer_deleted',
		userId: String(rest.id),
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
