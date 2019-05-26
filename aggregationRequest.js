function AggregationRequest () {
	function AggregationRequest (type, start, end, rawRequestId, pk, nextUser, encryptionKey, encryptedRequest) {
		this.type = type
		this.start = start
		this.end = end
		this.rawRequestId = rawRequestId,
		this.pk = pk,
		this.nextUser = nextUser,
		this.encryptionKey = encryptionKey,
		this.encryptedRequest = encryptedRequest
	}

	function AggregationRequestFromObject (obj) {
		if (!obj.type ||
			!obj.start || 
			!obj.end ||
			!obj.users ||
			!obj.users.length ||
			obj.users.length == 0 ||
			!tmp.pk ||
			obj.nextUser === undefined ||
			!obj.rawRequestId ||
			!obj.encryptionKey ||
			!obj.encryptedRequest) {
			return null
		} else {
			return new User(
				obj.type, 
				obj.start, 
				obj.end,
				obj.rawRequestId,
				obj.pk,
				obj.nextUser,
				obj.users,
				obj.encryptionKey,
				obj.encryptedRequest
			)
		}
	}

	return {"fromObject": AggregationRequestFromObject}
}

module.exports = AggregationRequest()