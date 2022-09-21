'use strict'
import { HTTPCRUD, WSSCRUD, RequestError } from './gravcrud.js'

class GravError extends $Error {
	constructor ( responseText ) {
		super ( `API error: \`${ responseText }\`` )
	}
}

class GravAuthError extends GravError {
	constructor( responseText ) {
		super( `Login error: \`${ responseText }\`` )
	}
}

class SdkAuth {
	constructor ( sslVerifyEnabled ) {
		this.CRUD = new HTTPCRUD ( `https://${ location.host }`, sslVerifyEnabled )
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
				responseData[ 'error' ]
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
			return [ true, responseData[ 'rows' ] ]
	}
	
	// more direct way of getting login info
	async info () {
		try {
			const response = await this.CRUD.read( 'login/' )
			if (response.error) throw new Error(response.error)
			return response.rows && response.rows[0] || null
		} catch (e) { throw new Error(`[sdk.auth.info] ${e.message}`) }
	}
	
	/**
	 * @param {string} username
	 * @param {string} password
	 */
	async login ( username, password, type = null ) {
		const payload = {
			USER : username,
			PASSWORD : password
		}
		
		if ( type )
			payload.TYPE = type

		const responseData = await this.CRUD.create (
			'login/',
			null,
			payload,
		)
		
		if ( !responseData )
			throw new GravAuthError ( responseData[ 'error' ] )
		
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
}

export class sdkv1 {
	constructor( host, sslVerifyEnabled ) {

		if( !host )
			return
		
		this.url = new URL ( host )
		
		if ( typeof sslVerifyEnabled === 'undefined' )
			sslVerifyEnabled = true
		
		this.sslVerifyEnabled = sslVerifyEnabled
		this.protocol = this.url.protocol
		this.auth = new SdkAuth( sslVerifyEnabled )
		
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
	
	client ( id ) {
		return new sdkv1client ( this, id )
	}

	cti()
	{
		return new sdkv1cti( this )
	}
	
	/**
	 * @param {int} limit
	 */
	oe_clien = ( limit = 100, fields = null, args = {} ) => {
		const uri = 'OE_CLIEN/'
		let params = {
			limit : limit,
			...args
		}
		if ( fields )
			params.fields = 'CLIENT_ID,NAME,' + fields
		return this.CRUD.read ( uri, params )
	}
	
	acd() { 
		return new sdkv1endpoint( this, 'PT_ACD/' )
	}
	
	alpha() { 
		return new sdkv1endpoint( this, 'GVALPHAS/' )
	}

	billing( event ) {
		return new sdkv1endpoint( this, `billing/event/${ event }` )
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
	
	did() {
		return new sdkv1endpoint( this, 'did/' )
	}
	
	dispatch_configs() {
		return new sdkv1endpoint( this, 'DISP_CONF/' )
	}
	
	employees() {
		return new sdkv1endpoint( this, 'employees/')
	}
	
	holidays() {
		return new sdkv1endpoint( this, 'GV_HOLIDAYS/' )
	}

	icall() {
		return new sdkv1endpoint( this, 'PT_ICALL/' )
	}
	
	dispatch_jobs() {
		return new sdkv1endpoint( this, 'dispatch/jobs/' )
	}
	
	account_keywords() {
		return new sdkv1endpoint( this, 'keywords/' )
	}
	
	keywords() {
		return new sdkv1endpoint( this, 'PTLOOKUP/' )
	}
	
	log() {
		return new sdkv1endpoint( this, 'CHANGELOG/' )
	}
	
	message_checks() {
		return new sdkv1endpoint ( this, 'message-check/' )
	}
	
	message_checks_sub ( table ) {
		return new sdkv1endpoint ( this, `message-check/${table}/` )
	}
	
	park() {
		return new sdkv1endpoint( this, 'PT_PARK/' )
	}
	
	priority() {
		return new sdkv1endpoint( this, 'PRIORITY/' )
	}

	queue() { 
		return new sdkv1endpoint( this, 'PT_QUEUE/' )
	}

	reminders() {
		return new sdkv1endpoint( this, 'PTREMIND/' )
	}
	
	advanced_delivery() {
		return new sdkv1endpoint( this, 'OE_SCHED/' )
	}
	
	simple_delivery() {
		return new sdkv1endpoint( this, 'PT_SCHED/' )
	}

	schema ( table ) {
		return new sdkv1endpoint( this, 'schema/' + table )
	}
	
	skill() {
		return new sdkv1endpoint( this, 'GV_SKILLS/')
	}
	
	status() {
		return new sdkv1endpoint( this, 'PTSTATUS/' )
	}

	pt_main() {
		return new sdkv1endpoint( this, 'PT_MAIN/' )
	}

	pt_type() {
		return new sdkv1endpoint( this, 'PT_TYPE/' )
	}

	prcolors() {
		return new sdkv1endpoint( this, 'PRCOLORS/' )
	}
	
	reports() {
		return new sdkv1endpoint( this, `REPORTDATA/` )
	}
	
	report_builder() {
		return new sdkv1endpoint( this, 'report-builder/' )
	}
	
	system_dials() {
		return new sdkv1endpoint( this, `PT_XFER/` )
	}
	
	timed_actions() {
		return new sdkv1endpoint( this, 'PT_TACTION/' )
	}
	
	task_hist() {
		return new sdkv1endpoint( this, 'TASK_HIST/' )
	}

	timezone() {
		return new sdkv1endpoint( this, 'TIMEZONE/' )
	}

	trn_task() {
		return new sdkv1endpoint( this, 'TRN_TASK/' )
	}

	trn_queue() {
		return new sdkv1endpoint( this, 'TRN_QUEUE/' )
	}
	
	zip() {
		return new sdkv1endpoint( this, 'OE_ZIP/' )
	}
}

// TODO FIXME: needs tests
export class sdkv1client {
	/**
	 * @param {sdkv1} sdk
	 * @param {int|string} clientId
	 */
	constructor( sdk, id ) {
		this.sdk = sdk
		this.id = id
		this.path = `acct/${ id }/`
	}
	
	abend() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_ABEND/' )
	}
	
	answer_phrase() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_APHRASE/' )
	}
		
	autoA() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_AUTOA/' )
	}
	
	autoB() { 
		return new sdkv1endpoint( this.sdk, this.path + 'PT_AUTOB/' )
	}
	
	batch_exports() {
		return new sdkv1endpoint( this.sdk, this.path + 'BTCHEXPT/' )
	}
	
	batch_reports() {
		return new sdkv1endpoint( this.sdk, this.path + 'BTCHRPRT/' )
	}
	
	be_ordersx ( tbl ) {
		return new sdkv1endpoint ( this.sdk, this.path + `BEX/${ tbl }/`)
	}
	
	br_oe_rprt ( tbl ) {
		return new sdkv1endpoint ( this.sdk, this.path + `BRPT/${ tbl }/`)
	}
	
	caller() {
		return new sdkv1endpoint( this.sdk, this.path + 'CALLER/' )
	}
	
	callr() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_CALLR/' )
	}
	
	condition_library() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_CONDLIB/' )
	}
	
	contact_forms( type ){
		return new sdkv1endpoint ( this.sdk, this.path + `CONTACT_FORMS/${ type }` )
	}
	
	contacts() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_CONTC/' )
	}
	
	copy_to() {
		return new sdkv1endpoint( this.sdk, this.path + 'PTCOPYTO/' )
	}
		
	customer() {
		return new sdkv1endpoint( this.sdk, this.path + 'CUSTOMER/' )
	}
	
	custindex() {
		return new sdkv1endpoint( this.sdk, this.path + 'CUSTINDEX/' )
	}
	
	dcl() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_DCL/' )
	}
	
	dealers() {
		return new sdkv1endpoint( this.sdk, this.path + 'DEALERS/' )
	}

	dealers_locate() {
		return new sdkv1endpoint( this.sdk, this.path + 'DEALER_LOCATE/' )
	}
	
	dealr() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_DEALR/' )
	}
	
	disp_proc () {
		return new sdkv1endpoint ( this.sdk, this.path + 'dispatch-procedures/' )
	}
	
	dispatch_procedures() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_PROC/' )
	}
	
	flow() {
		return new sdkv1endpoint( this.sdk, this.path + 'GV_FLOW/' )
	}
	
	form() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_FORM/' )
	}
	
	getoncall() {
		return new sdkv1endpoint( this.sdk, this.path + 'GETONCALL/' )
	}

	getdbrow() {
		return new sdkv1endpoint( this.sdk, this.path + 'GETDBROW/' )
	}
	
	goto() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_GOTO/' )
	}
	
	help() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_HELP/' )
	}
	
	hist() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_HIST/' )
	}
	
	holidays() {
		return new sdkv1endpoint( this.sdk, this.path + 'GV_HOLIDAYS/' )
	}
	
	keywords() {
		return new sdkv1endpoint( this.sdk, this.path + 'PTLOOKUP/')
	}
	
	mdtpl() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_MDTPL/' )
	}
	
	oe_admin() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_ADMIN/' )
	}
	
	orders() {
		return new ordersendpoint( this.sdk, this.path + 'ORDERS/' )
	}
	
	orders_newnumber() {
		return new ordersendpoint( this.sdk, this.path + 'ORDERS/NEW_NUMBER/' )
	}
	
	oncall() {
		return new sdkv1endpoint( this.sdk, this.path + 'PTONCALL/' )
	}
	
	oncall_table ( tablename ) {
		return new sdkv1endpoint( this.sdk, this.path + `${ tablename }/` )
	}
	
	picklist() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_PKLST/' )
	}
	
	pl ( tbl ) {
		return new sdkv1endpoint ( this.sdk, this.path + `PL/${ tbl }/`)
	}
	
	pt_locate() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_LOCAT/' )
	}

	redeliver() {
		return new sdkv1endpoint( this.sdk, this.path + 'REDELIVER/' )
	}
	
	reasons() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_REAS/' )
	}

	simple_delivery_conditions() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_BATCH/' )
	}
	
	skiplist() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_SKIP/' )
	}

	sl ( tbl ) {
		return new sdkv1endpoint ( this.sdk, this.path + `SL/${ tbl }/`)
	}

	special() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_SPEC/' )
	}
	
	steps() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_PROCDET/' )
	}

	schema( table ) {
		return new sdkv1endpoint( this.sdk, this.path + 'schema/' + table )
	}
	
	system_dials() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_XFER/' )
	}

	tables () {
		return new sdkv1endpoint( this.sdk, this.path + 'TABLES/' )
	}

	tpl () {
		return new sdkv1endpoint( this.sdk, this.path + 'tpl/' )
	}

	trn_orders () {
		return new ordersendpoint( this.sdk, this.path + 'TRN_ORDERS/' )
	}
	
	trn_hist () {
		return new sdkv1endpoint( this.sdk, this.path + 'TRN_HIST/' )
	}
	
	templates () {
		return new sdkv1endpoint( this.sdk, this.path + 'templates' )
	}
}

export class sdkv1cti {
	/**
	 * @param {sdkv1} sdk
	 */
	constructor( sdk ) {
		this.sdk = sdk
		this.path = `cti/`
	}
	
	async connect()
	{
		return await this.sdk.CRUD.create ( 'cti/' )
	}

	async disconnect()
	{
		return await this.sdk.CRUD.delete ( 'cti/' )
	}

	call_actions( action )
	{
		action = ( action + '' ).toLowerCase()
		return new sdkv1endpoint( this.sdk, this.path + `talk_call/${action}` )
	}

	callparks() 
	{
		return new sdkv1endpoint( this.sdk, this.path + 'callparks/' )
	}

	async status ( status, state = null ) {
		let param = { 'status': status }
		if( state )
			param.state = state
		return await this.sdk.CRUD.create ( this.path + 'status/', null, param)
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
export class sdkv1endpoint {
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
			//params.filter = Object.entries( args.filter ).map( ( [ k, v ] ) => { return `${ k }=${ v }` } ).join( ',' )
			params.filter = params.filter
		if ( params.order )
			params.order = params.order
		
		return await this.sdk.CRUD.read (
			this.endpoint,
			params
		)
	}
	
	async find ( params = { limit : 100, value: '' } ) {
		let endpoint = `${ this.endpoint }?limit=${ params.limit }&find=${ params.value }`
		return await this.sdk.CRUD.read ( endpoint )
	}

	async count( params ) {
		let endpoint = `${ this.endpoint }count`
		return await this.sdk.CRUD.read (
			endpoint,
			params,
		)
	}
	
	async insert ( data, params = null ) {
		return await this.sdk.CRUD.create (
			this.endpoint,
			params,
			data,
		)
	}
	
	get = async ( item, params = {} ) => {
		let endpoint = `${ this.endpoint }${ item }`
		return await this.sdk.CRUD.read (
			endpoint,
			params,
		)
	}
	
	async replace ( item, data ) {
		let endpoint = `${ this.endpoint }${ item }`
		return await this.sdk.CRUD.replace (
			endpoint,
			null,
			data,
		)
	}
	
	async update ( item, data, args = null ) {
		let endpoint = `${ this.endpoint }${ item }`
		return await this.sdk.CRUD.update (
			endpoint,
			args,
			data,
		)
	}

	async updateq ( item, data, args = null ) {
		let endpoint = `${ this.endpoint }?item=${ item }`
		return await this.sdk.CRUD.update (
			endpoint,
			args,
			data,
		)
	}
	
	async delete ( item ) {
		let endpoint = `${ this.endpoint }${ item }`
		return await this.sdk.CRUD.delete (
			endpoint,
		)
	}

	async deleteq ( item ) {
		let endpoint = `${ this.endpoint }?item=${ item }`
		return await this.sdk.CRUD.delete (
			endpoint,
		)
	}
}

export class ordersendpoint extends sdkv1endpoint {
	async alert ( order_num, body ) {
		let url = `${ this.endpoint }${ order_num }/alert`
		return await this.sdk.CRUD.create ( url, null, body )
	}

	async prioritize (  order_num, body ) {
		let url = `${ this.endpoint }${ order_num }/prioritize`
		return await this.sdk.CRUD.create ( url, null, body )
	}

	async undeliver (  order_num, body ) {
		let url = `${ this.endpoint }${ order_num }/undeliver`
		return await this.sdk.CRUD.create ( url, null, body )
	}

	async hold (  order_num, body ) {
		let url = `${ this.endpoint }${ order_num }/hold`
		return await this.sdk.CRUD.create ( url, null, body )
	}

	async deliver (  order_num, body ) {
		let url = `${ this.endpoint }${ order_num }/deliver`
		return await this.sdk.CRUD.create ( url, null, body )
	}
	
	async comment ( order_num, body ) {
		let url = `${ this.endpoint }${ order_num }/comment`
		return await this.sdk.CRUD.create ( url, null, body )
	}
}