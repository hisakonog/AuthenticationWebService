module.exports = {
	"id": "User",
	"properties": {
		"tags": {
			"items": {
				"$ref": "Tag"
			},
			"type": "Array"
		},
		"id": {
			"type": "long"
		},
		"category": {
			"type": "Category"
		},
		"status": {
			"allowableValues": {
				"valueType": "LIST",
				"values": [
					"available",
					"pending",
					"sold"
				]
			},
			"description": "user status in the store",
			"type": "string"
		},
		"name": {
			"type": "string"
		},
		"photoUrls": {
			"items": {
				"type": "string"
			},
			"type": "Array"
		}
	}
};