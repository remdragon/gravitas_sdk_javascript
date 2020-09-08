const assert = require ( 'assert' )

const sdkv1 = require ( '../gravsdk' ).sdkv1

const URL = 'https://127.0.0.1/rest'
describe ( 'Tests for main SDK', () => {
	
	it ( 'core', () => {
		
		const sdk = new sdkv1 ( URL )
		
	} );
	
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
	
} );