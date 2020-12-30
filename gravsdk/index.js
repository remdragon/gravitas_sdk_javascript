'use strict';

import { HTTPCRUD, WSSCRUD } from './gravcrud.js'

class GravError extends Error {
	constructor ( responseText ) {
		super ( `API error: \`${responseText}\`` )
	}
}

class GravAuthError extends Error {
	constructor( responseText ) {
		super( `Login error: \`${responseText}\`` )
	}
}

export default class sdkv1 {
	constructor( host, sslVerifyEnabled ) {

		this.url = new URL ( host )

		if ( typeof sslVerifyEnabled === 'undefined' )
			sslVerifyEnabled = true
		
		this.sslVerifyEnabled = sslVerifyEnabled
		this.protocol = this.url.protocol

		if ( this.protocol == 'https:' ) {
			this.CRUD = new HTTPCRUD ( host, this.sslVerifyEnabled, )
		}
		else if ( this.protocol === 'wss:' ) {
			this.CRUD = new WSSCRUD ( host )
		}
		else {
			throw new GravError ( 'invalid protocol specified, must be `https` or `wss`' )
		}
	}

	async connect()
	{
		return await this.CRUD.connect()
	}
	
	/**
	 * @param {boolean} result
	 * @param {Object} responseData
	 * @returns {boolean}
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
		
		return success
	}
	
	async login_session_check() {
		const responseData = await this.CRUD.read ( 'login', {} );
		if ( !this._login_sanity_check( true, responseData ) )
			return [ false, {} ]
		if ( !responseData.rows || responseData.rows.length == 0 )
			return [ false, {} ]
		else
			return [ true, responseData['rows'] ]
	}
	
	/**
	 * @param {string} username
	 * @param {string} password
	 */
	async login ( username, password ) {

		const payload = {
			'USER': username,
			'PASSWORD': password,
		}

		const responseData = await this.CRUD.create(
			'login',
			payload,
		)

        if ( !responseData )
            throw new GravAuthError ( responseData['error'] )
		
		// TODO FIXME: deal with other scenarios
		return responseData
	}
	
	async logout() {
		const result = await this.CRUD.delete(
			'login',
			{}
		)
		return this._login_sanity_check( true, result )
	}
	
	async clients( limit = 100 ) {
		return await this.CRUD.read (
			'clients',
			{ limit: limit }
		)
	}

	client ( id )
	{
		return new skdv1client ( this, id )	
	}

	/**
	 * @param {int} limit
	 */
	oe_clien ( limit = 100, fields = 'CLIENT_ID,NAME' ) {
		const uri = '/rest/OE_CLIEN'
		const params = {
			limit: limit,
			fields: fields
		}
		return this.sdk.CRUD.read ( uri, params )
	}
}

// TODO FIXME: needs tests
class skdv1client {
	/**
	 * @param {sdkv1} sdk
	 * @param {int|string} clientId
	 */
	constructor( sdk, clientId ) {
		this.sdk = sdk
		this.clientId = clientId
		this.path = `/acct/${clientId}/`
	}
		
	orders() {
		return new sdkv1endpoint(
			this.sdk,
			this.path + 'ORDERS'
		)
	}
	
	contacts() {
		return new sdkv1endpoint(
			this.sdk,
			this.path + 'PT_CONTC'
		)
	}
}

// This is a way to have typed optional args in JS.
/**
 * @interface
 */
function SearchArgsInterface() {
	/**
	 * @type {Array<string>}
	 */
	this.fields = null
	this.limit = 100
	this.offset = 0
	/**
	 * @type {Object}
	 */
	this.filter = null
}

// TODO FIXME: needs tests
class sdkv1endpoint {
	/**
	 * @param {sdkv1} sdk
	 * @param {string} endpoint
	 */
	constructor( sdk, endpoint ) {
		this.sdk = sdk
		this.endpoint = endpoint
	}
	
	/**
	 * @param {SearchArgsInterface} args
	 */
	async search ( args ) {
		const params = {}
		if ( args.limit )
			params.limit = args.limit
		if ( args.offset )
			params.offset = args.offset
		if ( args.fields )
			params.fields = args.fields.join ( ',' )
		if ( args.filter )
			params.filter = Object.entries( args.filter )
			.map( ([k, v]) => { return `${k}=${v}` } ).join( ',' )
		
		return await this.sdk.CRUD.read (
			this.endpoint,
			params
		)
	}
}
