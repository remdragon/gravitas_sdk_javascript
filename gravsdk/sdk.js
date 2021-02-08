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
			'USER': username,
			'PASSWORD': password
		}

		if( type )
			payload['TYPE'] = type

		const responseData = await this.CRUD.create(
			'login/',
			payload,
		)
		
        if ( !responseData )
            throw new GravAuthError ( responseData['error'] )
		
		// TODO FIXME: deal with other scenarios
		return responseData
	}
	
	async logout() {
		const result = await this.CRUD.delete(
			'login/',
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

	clien() { 
		return new sdkv1endpoint( this, 'OE_CLIEN' )
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

	holiday() {
		return new sdkv1endpoint( this,  'PTHOLDAY' )
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
		return new sdkv1endpoint( this, 'PT_QUEUE' )
	}

	sched() {
		return new sdkv1endpoint( this, 'PT_SCHED' )
	}

	status() {
		return new sdkv1endpoint( this, 'PTSTATUS' )
	}

	lookup() {
		return new sdkv1endpoint( this, 'PTLOOKUP' )
	}

	remind() {
		return new sdkv1endpoint( this, 'PTREMIND' )
	}

	taction() {
		return new sdkv1endpoint( this, 'PT_TACTION' )
	}

	_type() {
		return new sdkv1endpoint( this, 'PT_TYPE' )
	}

	prcolors() {
		return new sdkv1endpoint( this, 'PRCOLORS' )
	}
	
	/**
	 * Dynamic Staff Endpoint
	 * @param {str} dir, directory endpoint
	 * @param {array} adData, Collection of data to insert in body
	 */
	async staff_ep (dir, adData = {})
	{	
		const args = adData
		
		const responseData = await this.CRUD.create(
			`staff/${dir}`,
			args
		)

        if ( !responseData )
            throw new GravAuthError ( responseData['error'] )
		
		// TODO FIXME: deal with other scenarios
		return responseData
	}

	/**
	 * Dynamic Chat Endpoint
	 * @param {str} dir, directory endpoint
	 * @param {array} adData, Collection of data to insert in body
	 */
	async chat_ep (dir, adData = {}) 
	{
		const args = adData
		
		const responseData = await this.CRUD.create(
			`webchat/${dir}`,
			args
		)

        if ( !responseData )
            throw new GravAuthError ( responseData['error'] )
		
		// TODO FIXME: deal with other scenarios
		return responseData
	}

	/**
	 * Dynamic acct Endpoint
	 * @param {str} dir, directory endpoint
	 * @param {array} adData, Collection of data to insert in body
	 */
	async acct_ep (dir, adData = {}) 
	{
		const args = adData
		
		const responseData = await this.CRUD.read(
			`acct/${dir}`,
			args
		)

        if ( !responseData )
            throw new GravAuthError ( responseData['error'] )
		
		// TODO FIXME: deal with other scenarios
		return responseData
	}

	/**
	 * Dynamic priority Endpoint
	 * @param {str} dir, directory endpoint
	 * @param {array} adData, Collection of data to insert in body
	 */
	async priority_ep (dir = '', adData = {}) 
	{
		const args = adData
		
		const responseData = await this.CRUD.read(
			'priority' + (dir != ''?`/${dir}`:''),
			args
		)

        if ( !responseData )
            throw new GravAuthError ( responseData['error'] )
		
		// TODO FIXME: deal with other scenarios
		return responseData
	}

	/**
	 * Dynamic rest Endpoint
	 * @param {str} dir, directory endpoint
	 * @param {array} adData, Collection of data to insert in body
	 */
	async rest_ep (dir = '', adData = {}) 
	{
		const args = adData
		
		const responseData = await this.CRUD.read(
			dir,
			args
		)

        if ( !responseData )
            throw new GravAuthError ( responseData['error'] )
		
		// TODO FIXME: deal with other scenarios
		return responseData
	}
}

// TODO FIXME: needs tests
class skdv1client {
	/**
	 * @param {sdkv1} sdk
	 * @param {int|string} clientId
	 */
	constructor( sdk, id ) {
		this.sdk = sdk
		this.id = id
		this.path = `acct/${id}/`
	}

	data()
	{
		return this.sdk.CRUD.read (
			`clients/${this.id}`,
			{}
		)
	}

	keywords() {
		return new sdkv1endpoint( this.sdk, this.path + 'KEYWORDS' )
	}

	abend() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_ABEND' )
	}

	form() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_FORM' )
	}

	goto() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_GOTO' )
	}

	help() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_HELP' )
	}
		
	orders() {
		return new sdkv1endpoint( this.sdk, this.path + 'ORDERS' )
	}

	oncall ( item ) {
		return new sdkv1endpoint( this.sdk, this.path + 'PTONCALL' )
	}

	oc ( tbl )
	{
		return new sdkv1endpoint( this.sdk, this.path + tbl )
	}

	picklist()
	{
		return new sdkv1endpoint( this.sdk, this.path + 'OE_PKLST' )
	}

	pl ( tbl )
	{
		return new sdkv1endpoint ( this.sdk, this.path + `PL/${tbl}`)
	}

	autoA() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_AUTOA' )
	}

	autoB() { 
		return new sdkv1endpoint( this.sdk, this.path + 'PT_AUTOB' )
	}
	
	contacts() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_CONTC' )
	}

	dcl() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_DCL' )
	}

	hist() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_HIST' )
	}

	locate() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_LOCAT' )
	}

	mdtpl() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_MDTPL' )
	}

	proc() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_PROC' )
	}

	aphrase() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_APHRASE' )
	}

	procdet() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_PROCDET' )
	}

	caller() {
		return new sdkv1endpoint( this.sdk, this.path + 'CALLER' )
	}

	customer() {
		return new sdkv1endpoint( this.sdk, this.path + 'CUSTOMER' )
	}

	dealers() {
		return new sdkv1endpoint( this.sdk, this.path + 'DEALERS' )
	}

	dealr() {
		return new sdkv1endpoint( this.sdk, this.path + 'OE_DEALR' )
	}

	condlib() {
		return new sdkv1endpoint( this.sdk, this.path + 'PT_CONDLIB' )
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

	async create ( params ) 
	{
		return await this.sdk.CRUD.create ( 
			this.endpoint,
			params
		)
	}

	async update ( id, params )
	{
		return await this.sdk.CRUD.update (
			this.endpoint,
			params
		)
	}
	
	async delete ( id )
	{
		return await this.sdk.CRUD.delete ( 
			this.endpoint,
			{}
		)
	}
}
