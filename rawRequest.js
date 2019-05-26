function RawRequest () {
	function RawRequest (type, start, end) {
		this.type = type
		this.start = start
		this.end = end
	}

	function RawRequestFromObject (obj) {
		if (!obj.type || !obj.start || !obj.end) {
			return null
		} else {
			return new RawRequest(obj.type, obj.start, obj.end)
		}
	}

	return {"fromObject": RawRequestFromObject}
}

module.exports = RawRequest()