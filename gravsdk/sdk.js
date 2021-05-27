'use strict'

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

export class sdkv1 {
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
		const responseData = await this.CRUD.read ( 'login/', {} );
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
	async login ( username, password, type = null ) {
		const payload = {
			USER: username,
			PASSWORD: password
		}
		
		if ( type )
			payload.TYPE = type

		const responseData = await this.CRUD.create (
			'login/',
			null,
			payload,
		)
		
		if ( !responseData )
			throw new GravAuthError ( responseData['error'] )
		
		// TODO FIXME: deal with other scenarios
		return responseData
	}
	
	async logout() {
		const result = await this.CRUD.delete (
			'login/',
			{}
		)
		return this._login_sanity_check( true, result )
	}
	
	client ( id ) {
		return new sdkv1client ( this, id )
	}
	
	/**
	 * @param {int} limit
	 */
	oe_clien = ( limit = 100, fields = null, args = {} ) => {
		const uri = 'OE_CLIEN'
		const params = {
			limit: limit,
			fields: 'CLIENT_ID,NAME' + (fields? ","+fields:''),
			...args
		}
		return this.CRUD.read ( uri, params )
	}
	
	categories() {
		return new sdkv1endpoint( this, 'categories/' )
	}
	
	clients() {
		return new sdkv1endpoint( this, 'clients/' )
	}
	
	contact_types() {
		return new sdkv1endpoint( this, 'contact-types' )
	}
	
	employees() {
		return new sdkv1endpoint( this, 'employees/')
	}

	did() {
		return new sdkv1endpoint( this, 'OE_DID' )
	}
	
	zip() {
		return new sdkv1endpoint( this, 'OE_ZIP' )
	}

	priority() {
		return new sdkv1endpoint( this, 'PRIORITY' )
	}

	task_hist() {
		return new sdkv1endpoint( this, 'TASK_HIST' )
	}

	holiday() {
		return new sdkv1endpoint( this, 'PTHOLDAY' )
	}

	acd() { 
		return new sdkv1endpoint( this, 'PT_ACD' )
	}

	icall() {
		return new sdkv1endpoint( this, 'PT_ICALL' )
	}
	
	park() {
		return new sdkv1endpoint( this, 'PT_PARK' )
	}

	queue() { 
		return new sdkv1endpoint( this, 'PT_QUEUE/' )
	}

	sched() {
		return new sdkv1endpoint( this, 'PT_SCHED' )
	}
	
	skill() {
		return new sdkv1endpoint( this, 'GV_SKILLS')
	}

	status() {
		return new sdkv1endpoint( this, 'PTSTATUS' )
	}

	keywords() {
		return new sdkv1endpoint( this, 'PT_LOOKUP' )
	}

	remind() {
		return new sdkv1endpoint( this, 'PTREMIND' )
	}

	taction() {
		return new sdkv1endpoint( this, 'PT_TACTION' )
	}

	pt_main() {
		return new sdkv1endpoint( this, 'PT_MAIN/' )
	}

	pt_type() {
		return new sdkv1endpoint( this, 'PT_TYPE' )
	}

	prcolors() {
		return new sdkv1endpoint( this, 'PRCOLORS' )
	}
}

// TODO FIXME: needs tests
class sdkv1client {
	/**
	 * @param {sdkv1} sdk
	 * @param {int|string} clientId
	 */
	constructor( sdk, id ) {
		this.sdk = sdk
		this.id = id
		this.path = `acct/${id}/`
	}
	
	abend() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_ABEND/' )
	}
	
	form() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_FORM/' )
	}
	
	goto() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_GOTO/' )
	}
	
	help() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_HELP/' )
	}
	
	orders() {
		return new ordersendpoint( this.sdk, this.path + 'ORDERS/' )
	}
	
	oncall() {
		return new sdkv1endpoint( this.sdk, this.path + 'PTONCALL/' )
	}
	
	getoncall() {
		return new sdkv1endpoint( this.sdk, this.path + 'GETONCALL/' )
	}

	getfield() {
		return new sdkv1endpoint( this.sdk, this.path + 'GETDBFIELD/' )
	}
	
	oncall_table ( tablename ) {
		return new sdkv1endpoint( this.sdk, this.path + `${tablename}/` )
	}
	
	picklist() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_PKLST/' )
	}
	
	skiplist() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_SKIP/' )
	}
	
	pl ( tbl ) {
		return new sdkv1endpoint ( this.sdk, this.path + `PL/${tbl}/`)
	}

	sl ( tbl ) {
		return new sdkv1endpoint ( this.sdk, this.path + `SL/${tbl}/`)
	}
		
	autoA() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_AUTOA/' )
	}
	
	autoB() { 
		return new sdkv1endpoint( this.sdk, this.path + 'PT_AUTOB/' )
	}
	
	contacts() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_CONTC/' )
	}
	
	dcl() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_DCL/' )
	}
	
	hist() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_HIST/' )
	}
	
	pt_locate() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_LOCAT/' )
	}
	
	keywords() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_LOOKUP/')
	}
	
	mdtpl() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_MDTPL/' )
	}
	
	proc() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_PROC/' )
	}
	
	answer_phrase() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_APHRASE/' )
	}
	
	procdet() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_PROCDET/' )
	}
	
	caller() {
		return new sdkv1endpoint( this.sdk, this.path + 'CALLER/' )
	}
	
	customer() {
		return new sdkv1endpoint( this.sdk, this.path + 'CUSTOMER/' )
	}
	
	dealers() {
		return new sdkv1endpoint( this.sdk, this.path + 'DEALERS/' )
	}
	
	dealr() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_DEALR/' )
	}
	
	condlib() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_CONDLIB/' )
	}

	schema( table ) {
		return new sdkv1endpoint( this.sdk, this.path + 'schema/' + table )
	}

	tpl () {
		return new sdkv1endpoint( this.sdk, this.path + 'tpl/' )
	}
	
	templates () {
		return new sdkv1endpoint( this.sdk, this.path + 'templates' )
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
	 * @param {SearchArgsInterface} params
	 */
	async search ( params = {} ) {
		if ( params.limit )
			params.limit = params.limit
		if ( params.offset )
			params.offset = params.offset
		if ( params.fields )
			params.fields = params.fields.join ( ',' )
		if ( params.filter )
			//params.filter = Object.entries( args.filter ).map( ([k, v]) => { return `${k}=${v}` } ).join( ',' )
			params.filter = params.filter
		if ( params.order )
			params.order = params.order
		
		return await this.sdk.CRUD.read (
			this.endpoint,
			params
		)
	}
	
	async insert ( data, params = null ) {
		return await this.sdk.CRUD.create (
			this.endpoint,
			params,
			data,
		)
	}
	
	get = async ( item, args = {} ) => {
		let endpoint = `${this.endpoint}${item}`
		let params = {}
		return await this.sdk.CRUD.read (
			endpoint,
			params,
		)
	}
	
	async replace ( item, data ) {
		let endpoint = `${this.endpoint}${item}`
		return await this.sdk.CRUD.replace (
			endpoint,
			null,
			data,
		)
	}
	
	async update ( item, data, args = null ) {
		let endpoint = `${this.endpoint}${item}`
		return await this.sdk.CRUD.update (
			endpoint,
			args,
			data,
		)
	}
	
	async delete ( item ) {
		let endpoint = `${this.endpoint}${item}`
		return await this.sdk.CRUD.delete (
			endpoint,
		)
	}
}

class ordersendpoint extends sdkv1endpoint {
	async alert ( order_num, body ) {
		let url = `${this.endpoint}${order_num}/alert`
		return await this.sdk.CRUD.create ( url, null, body )
	}

	async prioritize (  order_num, body ) {
		let url = `${this.endpoint}${order_num}/prioritize`
		return await this.sdk.CRUD.create ( url, null, body )
	}

	async undeliver (  order_num, body ) {
		let url = `${this.endpoint}${order_num}/undeliver`
		return await this.sdk.CRUD.create ( url, null, body )
	}

	async hold (  order_num, body ) {
		let url = `${this.endpoint}${order_num}/hold`
		return await this.sdk.CRUD.create ( url, null, body )
	}

	async deliver (  order_num, body ) {
		let url = `${this.endpoint}${order_num}/deliver`
		return await this.sdk.CRUD.create ( url, null, body )
	}
	
	async comment ( order_num, body ) {
		let url = `${this.endpoint}${order_num}/comment`
		console.log(`comment: ${url}`)
		return await this.sdk.CRUD.create ( url, null, body )
	}
}