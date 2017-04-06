Meteor.methods({
	sendSlackDM: function (data0, data1, user) {
		console.log('sendSlackDM called')
		const items = Inventory.find({'_id' : {$in: data0.mostRecent}}).fetch()

		items.forEach((item) => {
			if (item.spotifyAlbumUrl) {
				const spotifyId = item.spotifyAlbumUrl ? item.spotifyAlbumUrl.split('/').pop() : null

				HTTP.call('POST', Meteor.settings.bot + '/slack/send', {
					data: {
						"email": data0.user_email,
						"item": {
							"warehouseId": item._id,
							"spotifyId": spotifyId,
							"artist": item.artist,
							"album": item.album,
							"image": item.images && item.images.spotify ? item.images.spotify : null,
							"price": item.retail,
							"data": JSON.stringify(item)
						}
					}
				}, (err, res) => {
					if (err) {
						console.log('* ** *** ** *')
						console.log('/slack/send', err)
						console.log('* ** *** ** *')
					} else {
						console.log('* ** *** ** *')
						console.log('inventory returned to wishlist bot')
						console.log('* ** *** ** *')
					}
				})
			}
		})
	}
})
