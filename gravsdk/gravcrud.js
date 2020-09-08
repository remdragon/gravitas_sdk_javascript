const axios = require ( 'axios' ).default
const axiosCookieJarSupport = require ( 'axios-cookiejar-support' ).default
const tough = require ( 'tough-cookie' )
const https = require ( 'https' );

axiosCookieJarSupport ( axios )

axios.defaults.withCredentials = true;

const jsonBodyNull = null
const paramsNull = null

class GravJSONValueError extends Error {
	/*
	Exception Class: GravJSONValueError
	
	Exception raised for invalid API responses. All API responses are expected to be JSON parseable, so if a response is received that is not this exception is thrown
	
	|Attributes|Description|
	|-|-|
	|responsetext|The full response provided by the API|
	
	## Usage:
		throw new GravJSONValueError( req.text )
	*/
	
	constructor ( responseText ) {
		super ( responseText )
	}
}

exports.GravJSONValueError = GravJSONValueError;

class HTTPCRUDParams {
	/**
	 * @param {Object|null|undefined} params query string params
	 * @param {Object|null|undefined} jsonBody
	 */
	constructor( params, jsonBody ) {
		this.params = params
		this.jsonBody = jsonBody
	}
}

exports.HTTPCRUDParams

class HTTPCRUD {
	
	/**
	 * @param {String} host
	 * @param {Boolean} sslVerifyEnabled
	 * @param {Boolean|undefined} testMode
	 * 
	 * */
	constructor( host, sslVerifyEnabled, testMode ) {
		
		this.host = host
		this.sslVerifyEnabled = sslVerifyEnabled
		this.testMode = testMode || false
		this._cookieJar = new tough.CookieJar()
		this._httpsAgent = new https.Agent({
			rejectUnauthorized: this.sslVerifyEnabled
		});
	}
	
	/**
	 * 
	 * @param {String} method get, post, delete, etc
	 * @param {String} endpoint
	 * @param {HTTPCRUDParams} paramArgs
	 */
	async _request( method, endpoint, paramArgs ) {
		const uri = `${this.host}/rest/${endpoint}`
		/* istanbul ignore next */
		if ( typeof paramArgs === 'undefined' || paramArgs === null )
			paramArgs = HTTPCRUDParams()
		
		try {
			const result = await axios({
				method: method,
				url: uri,
				responseType: 'json',
				jar: this._cookieJar,
				params: paramArgs.params || null,
				data: paramArgs.jsonBody || null,
				responseType: 'json', // default, but wanted to make it clear
				timeout: 5000,
				httpsAgent: this._httpsAgent,
			});
			return result.data;
		}
		catch ( e ) {
			throw new GravJSONValueError( e.message );
		}
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} params
	 */
	async create ( endpoint, params ) {
		return await this._request(
			'post',
			endpoint,
			new HTTPCRUDParams( paramsNull, params ),
		);
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} params
	 */
	async read ( endpoint, params ) {
		return await this._request(
			'get',
			endpoint,
			new HTTPCRUDParams( params, jsonBodyNull ),
		);
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} params
	 */
	async update ( endpoint, params ) {
		return await this._request(
			'patch',
			endpoint,
			new HTTPCRUDParams( paramsNull, params ),
		);
	}
	
	/**
	 * @param {String} endpoint
	 * @param {Object} params
	 */
	async delete ( endpoint, params ) {
		return await this._request(
			'delete',
			endpoint,
			new HTTPCRUDParams( params, jsonBodyNull ),
		);
	}
	
}

exports.HTTPCRUD = HTTPCRUD