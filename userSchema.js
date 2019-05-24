function User () {
	function User (pk, pw, lastSignal) {
		this.pk = pk
		this.pw = pw
		this.lastSignal = lastSignal
	}

	function UserFromObject (obj) {
		if (!obj.pk || !obj.pw || !obj.lastSignal) {
			return null
		} else {
			return new User(obj.pk, obj.pw, obj.lastSignal)
		}
	}

	return {"fromObject": UserFromObject}
}

module.exports = User()