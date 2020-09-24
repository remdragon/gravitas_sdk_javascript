const assert = require ( 'assert' )
const expect = require ( 'expect' )

const sdkv1 = require ( '../gravsdk' ).sdkv1

const URL = 'https://127.0.0.1/rest'
describe ( 'SDK Tests', () => {
	const sdk = new sdkv1 ( URL )
	
	it ( '_login_sanity_check: invalid api data', () => {
		expect ( () => {
			sdk._login_sanity_check( false )
		} ).toThrowError ( 'Login error: `Invalid API Data received`' )
	} );
	
	it ( '_login_sanity_check: missing success', () => {
		expect ( () => {
			sdk._login_sanity_check( true, {} )
		} ).toThrowError ( 'Login error: `api response missing `success` key`' )
	} );
	
	it ( '_login_sanity_check: error found', () => {
		expect ( () => {
			sdk._login_sanity_check( true, { success: false, 'error': 'oops...' } )
		} ).toThrowError ( 'Login error: `oops...`' )
	} );
	
} );

describe( 'SDK edge cases', () => {
	
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