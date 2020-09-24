'use strict';

const url = require ( 'url' )

const gravcrud = require ( './gravcrud' )

/**
	# Exception Class: `GravError`
	Exception raised for general SDK errors

	|Attribute|Description|
	|-|-|
	|`responsetext`|Descriptive text of the error|
*/
class GravError extends Error {
	constructor ( responseText ) {
		super ( `API error: \`${responseText}\`` )
	}
}

class GravAuthError extends Error {
	/**
	# Exception Class: `GravAuthError`
	
	The `GravAuthError` exception class is raised when invalid credentials are used or response received from the API is missing data
	
	|Attribute|Type|Description|
	|-|-|-|
	|`responsetext`|str|Descriptive text of the failed authentication attempt|
	
	## Usage:
	
		throw new GravAuthError('No user data received')
	*/
	constructor( responseText ) {
		super( `Login error: \`${responseText}\`` )
	}
}

class GravGeneralError extends Error {
	/**
	# Exception Class: GravGeneralError

	The `GravGeneralError` exception class is raised when general non-specific errors occur, such as passing an incorrectly typed variable or other user mistakes occur.

	|Attribute|Type|Description|
	|-|-|-|
	|`responsetext`|str|Descriptive text of the error encountered|
	
	## Usage:
	
		throw new GravGeneralError('Invalid method specified: sdk.PUPPIES')

	*/
	constructor( responseText ) {
		super( `General error: \`${responsetext}\`` )
	}
}

const HttpProtocol = {
	https: 'https',
	wss: 'wss'
}

class sdkv1 {
	// TODO: Port in progress...
	
	constructor( host, sslVerifyEnabled, ) {
		
		if ( typeof sslVerifyEnabled === 'undefined' )
			sslVerifyEnabled = true
		
		this.sslVerifyEnabled = sslVerifyEnabled
		this.hostParts = url.parse ( host )
	
		// TODO FIXME: Find out why a colon is being left over...
		this.protocol = this.hostParts.protocol.replace ( ':', '' )
		
		if ( this.protocol == HttpProtocol.https ) {
			this.CRUD = new gravcrud.HTTPCRUD(
				this.hostParts.href,
				this.sslVerifyEnabled,
			)
		}
		else if ( this.protocol === HttpProtocol.wss ) {
			throw new GravError ( 'Not Implemented' );
		}
		else {
			throw new GravError ( 'invalid protocol specified, must be `https` or `wss`' )
		}
	}
	
	/**
	 * @param {boolean} result
	 * @param {Object} responseData
	 */
	_login_sanity_check ( result, responseData ) {
		if ( !result )
			throw new GravAuthError (
				'Invalid API Data received'
			)
		
		var success = responseData['success']
		if ( typeof success === 'undefined' )
			throw new GravAuthError (
				'api response missing `success` key'
			)
		// API authentication call was not successful
		if ( !success && 'error' in responseData )
			throw new GravAuthError (
				responseData['error']
			)
		
		return success;
	}
	
}

exports.sdkv1 = sdkv1