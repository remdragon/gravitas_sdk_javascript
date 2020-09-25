const expect = require ( 'expect' )

const sdkv1 = require ( '../gravsdk' ).sdkv1

describe ( 'SDK Tests', () => {
	describe ( '_login_sanity_check', () => {
		const sdk = new sdkv1 ( 'https://dummy' )
		
		it ( 'invalid api data', () => {
			expect ( () => {
				sdk._login_sanity_check( false )
			} ).toThrowError ( 'Login error: `Invalid API Data received`' )
		} );
		
		it ( 'missing success', () => {
			expect ( () => {
				sdk._login_sanity_check( true, {} )
			} ).toThrowError ( 'Login error: `api response missing `success` key`' )
		} );
		
		it ( 'error found', () => {
			expect ( () => {
				sdk._login_sanity_check( true, { success: false, 'error': 'oops...' } )
			} ).toThrowError ( 'Login error: `oops...`' )
		} );
	} );
	
	describe ( 'login tests', async () => {
		const URL = 'https://127.0.0.1:5000'
		const sdk = new sdkv1 ( URL, false )
		
		it ( 'login success', async () => {
			const result = await sdk.login ( 'setup', 'deleteme' )
			
			expect ( result ).toBe ( true )
		} )
		
		it ( 'login failure', () => {
			expect ( async () => {
				const result = await sdk.login( 'dummy', 'dummy' )
			} );
		} );
	} );
	
	describe ( 'logout tests', async () => {
		const URL = 'https://127.0.0.1:5000'
		const sdk = new sdkv1 ( URL, false )
		
		it ( 'logout', async () => {
			const loginResult = await sdk.login ( 'setup', 'deleteme' )
			expect ( loginResult ).toBe ( true )
			const logoutResult = await sdk.logout();
			expect ( logoutResult ).toBe ( true );
		} )
		
		it ( 'login failure', () => {
			expect ( async () => {
				const result = await sdk.logout()
				console.log( result )
			} )
		} )
	} )

	describe( 'edge cases', () => {
		
		it ( 'not implemented protocol', () => {
			
			try {
				const sdk = new sdkv1 ( 'wss://localhost/rest' )
			}
			catch ( e ) {
				assert ( e.message === 'API error: `Not Implemented`' )
			}
			
		} );
		
		it ( 'invalid protocol', () => {
			
			try {
				const sdk = new sdkv1 ( 'ssdfg://localhost/rest' )
			}
			catch ( e ) {
				assert ( e.message === 'API error: `invalid protocol specified, must be `https` or `wss``' )
			}
			
			
		} );
	} );
});