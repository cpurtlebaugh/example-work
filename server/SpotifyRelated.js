import initialArtists from './data/initialArtists';
import initialRelatedArtists from './data/initialRelatedArtists';
import relatedOfRelated from './data/relatedOfRelated';
import artistClusters from './data/artistClusters';
Future = Npm.require('fibers/future');

Meteor.methods({
    'singleRelated':function(arr){
        console.log('input length: ', arr.length)
        console.log('arr: ', arr)
        let count         = 0;
        let finalArr      = [];
        for(const artist of arr) {
              count++
              console.log('count: ', count)
              console.log('artist in loop: ', artist)
              let future = new Future();
              HTTP.call('GET', 'https://api.spotify.com/v1/search?q=' + encodeURIComponent(artist) + '&type=artist', (err, res) => {
                if (err) {
                    console.log(err)
                } else {
                    if(res.data.artists){
                        // query for related artists
                        let artistId = res.data.artists.items[0].id;
                        HTTP.call('GET', 'https://api.spotify.com/v1/artists/' + artistId + '/related-artists', (err, res) => {
                            if (err) {
                                console.log(err)
                            } else {
                                if(!_.isUndefined(res.data.artists)) {
                                    console.log('res data artists in related query: ', res.data.artists.length)
                                    let relatedArtists = res.data.artists;
                                    let relatedNamesArr = relatedArtists.map(function(artist){
                                      if(!_.isUndefined(artist) && !_.isUndefined(artist.name)) {
                                          if(!_.contains(finalArr, artist.name) && !_.contains(arr, artist.name)) {
                                              return artist.name
                                          }
                                      }
                                    })
                                    console.log('relatedNamesArr: ', relatedNamesArr.length)
                                    finalArr = finalArr.concat(relatedNamesArr);
                                    console.log('finalArr length: ', finalArr.length)
                                    future.return();

                                }
                            }
                        })
                    }
                }
              })

              future.wait()
              delay(5000)
        }
        finalRelated = finalArr.filter(function(val){
          if(!_.isUndefined(val)){
            return val
          }
        })

        masterArr = finalRelated.concat(arr)

        console.log('finalArr after filter', finalRelated.length)
        console.log('master array concat', masterArr.length)
        let doc = {'artist':arr[0], 'related':masterArr};
        RelatedArtists.insert(doc);
    },

    'testRelated':function(){
      var f             = new Future();
      var done          = false;
      var firstRelated  = [];
      var secondRelated = [];
      var count         = 0;
      var artistArr     = initialArtists.initialArtists;
      var related       = initialRelatedArtists.initialRelatedArtists
      for(const artist of related) {
            var future  = new Future();
            count++
            console.log('count: ', count)
            console.log('arr length: ', related.length)
            // query for artist id
            HTTP.call('GET', 'https://api.spotify.com/v1/search?q=' + encodeURIComponent(artist) + '&type=artist', (err, res) => {
              if (err) {
                console.log(err)
              } else {
                if(res.data.artists){
                // query for related artists
                    let artistId = res.data.artists.items[0].id;
                    let i = 0;
                    HTTP.call('GET', 'https://api.spotify.com/v1/artists/' + artistId + '/related-artists', (err, res) => {
                        // console.log('i: ', i)
                        if (err) {
                            console.log(err)
                        } else {
                            if(!_.isUndefined(res.data.artists)) {
                                let relatedArtists = res.data.artists
                                // cycle through all related of initial artist and add to arr
                                let relatedNamesArr = relatedArtists.map(function(artist){
                                  i++
                                  if(!_.isUndefined(artist) && !_.isUndefined(artist.name)) {
                                      if(!_.contains(firstRelated, artist.name) && !_.contains(artistArr, artist.name) && !_.contains(related), artist.name) {
                                          // console.log('artist name: ', artist)
                                          return artist.name
                                      } else {
                                          // console.log('aready contained in related arr')
                                      }
                                  }
                                })

                                console.log('res data artists length: ', res.data.artists.length)
                                console.log('artist arr lenght: ', related)
                                if(i === res.data.artists.length && count === related.length) {
                                    console.log('i: ', i, ' and count: ', count)
                                    console.log('first related arr: ', firstRelated)
                                    a = firstRelated.concat(relatedNamesArr)
                                    firstRelated = _.filter(a, function(name){ return name != undefined});
                                    RelatedArtists.insert(firstRelated)
                                    future.return()
                                } else {
                                    a = firstRelated.concat(relatedNamesArr)
                                    firstRelated = _.filter(a, function(name){ return name != undefined});
                                    future.return()
                                }
                            }
                        }

                    })
                }
              }

            })

            future.wait()
            console.log('firstRelated: ', firstRelated.length)
            delay(5000)
      }
    },

    'sortRelatedOfRelated':function(){
        var finished = []
        relatedOfRelated.relatedOfRelated.forEach(function(artist){
          if(!_.contains(finished, artist)){
            finished.push(artist)
          } else {
            console.log('dupe')
          }
        })

        RelatedArtists.insert({'finalArr':finished})
    },

    'getRelatedArtists': function () {
      var future  = new Future();
      var col     = STAGING_DB.collection('upsellRecords');
      var arr     = [];
      // Get the results using a find stream
      var cursor = col.find({$and:[{category: {$nin: ["hifi", "merch"]},$or:[{showInCuration:true}],quantity:{$gt:0}},{curationCategory:{$exists:true},$where:"this.curationCategory.length > 0"}]});
      cursor.on('data', function(doc) {
        arr.push(doc)
      });

      cursor.once('end', Meteor.bindEnvironment(() => {
        for (let i = 0; i < arr.length; i++) {
          const record = arr[i]

          // messy edge case handling
          if (record.artist == 'Wavves x Cloud Nothings') {
            record.artist = 'Wavves'
          } else if (record.artist == 'AJJ (fka Andrew Jackson Jihad)') {
            record.artist = 'AJJ'
          } else if (record.artist == 'Owen') {
            record.artist = 'American Football'
          } else if (record.artist == 'Various Artists') {
            continue
          } else if (record.artist == 'Various') {
            continue
          } else if (record.artist == 'Abel') {
            continue
          }

          setTimeout(Meteor.bindEnvironment(() => {
            HTTP.call('GET', 'https://api.spotify.com/v1/search?q=' + encodeURIComponent(record.artist) + '&type=artist', (err, res) => {
              if (err) {
                console.log(err)
              } else {
                // console.log('* ** *** ** *')
                // console.log('results for ' + record.artist)
                if (res.data.artists) {
                  const related = {
                    spotifyId: res.data.artists.items[0].id,
                    spotifyName: res.data.artists.items[0].name,
                    spotifyArtists: [],
                    spotifyGenres: res.data.artists.items[0].genres,
                    updated: Date.now()
                  }

                  HTTP.call('GET', 'https://api.spotify.com/v1/artists/' + related.spotifyId + '/related-artists', (err, res) => {
                    if (err) {
                      console.log(err)
                    } else {
                      related.spotifyArtists = res.data.artists
                      console.log(record.artist + ' / ' + related.spotifyName + ', artists: ' + related.spotifyArtists + ', genres: ' + related.spotifyGenres)
                      console.log(related)
                      col.update({_id: record._id}, {$set: {related: related}})
                    }
                  })
                } else {
                  console.log('* ** FIX ** *')
                }
                console.log('* ** *** ** *')
              }
            })
          }), 1000 * i)

        }
      }));

      return future.wait();
    },

    'getRelatedOfRelated': function () {
      var future  = new Future();
      var col     = STAGING_DB.collection('upsellRecords');
      var arr     = [];
      // Get the results using a find stream
      var cursor = col.find({related:{$exists:true}});
      cursor.on('data', function(doc) {
        arr.push(doc)
      });

      cursor.once('end', Meteor.bindEnvironment(() => {

        arr.forEach((record, recordIndex) => {
          let relatedOfRelated = []
          setTimeout(Meteor.bindEnvironment(() => {
            let step = 0
            record.related.spotifyArtists.forEach((relatedArtist, relatedArtistindex) => {
              setTimeout(Meteor.bindEnvironment(() => {

                HTTP.call('GET', 'https://api.spotify.com/v1/artists/' + record.related.spotifyId + '/related-artists', (err, res) => {
                  if (err) {
                    console.log(err)
                  } else {
                    step++

                    const artists = res.data.artists
                    console.log(record.related.spotifyName + ' => ' + relatedArtist.name + ' => ' + artists.length + ' related artists found')

                    artists.forEach((artist) => {
                      relatedOfRelated.push({
                        spotifyId: artist.id,
                        spotifyName: artist.name,
                        because: relatedArtist.name
                      })
                    })

                    if (step == 20) {
                      console.log(relatedOfRelated.length)
                      col.update({_id: record._id}, {$set: {'related.relatedOfRelated': relatedOfRelated}})
                      console.log('saved')
                    }

                  }
                })

              }), relatedArtistindex * 1200)
            })


          }), recordIndex * 24000)
        })

      }));

      return future.wait();
    },

    matchFavArtists: function () {
      console.log('* ** matchRelatedArtists ** *')

      const vibesCol = STAGING_DB.collection('Vibes'),
            vibes = [],
            prefabRecords = []

      const vibesCursor = vibesCol.find({prefab: true})

      vibesCursor.on('data', (doc) => { vibes.push(doc) })
      vibesCursor.once('end', Meteor.bindEnvironment(() => {

        vibes.forEach((vibe) => {
          vibe.catalog.forEach((record) => {
            prefabRecords.push(record.catalogID)
          })
        })

        const upsellRecordsCol = STAGING_DB.collection('upsellRecords')
        let upsellRecords = []

        const upsellRecordsCursor = upsellRecordsCol.find({$and: [{'id': {$nin: prefabRecords}}, {'related.relatedOfRelated': {$exists: true}}]})

        upsellRecordsCursor.on('data', (doc) => { upsellRecords.push(doc) })
        upsellRecordsCursor.once('end', Meteor.bindEnvironment(() => {

          const usersCol = STAGING_DB.collection('users'),
                users = []

          const usersCursor = usersCol.find({$and: [{'stripe.subscription.status':{$in: ['active', 'trialing']}}, {'questions.favArtists':{$exists:true}}]})

          usersCursor.on('data', (doc) => { users.push(doc) })
          usersCursor.once('end', Meteor.bindEnvironment(() => {

            users.forEach((user, index) => {

              setTimeout(Meteor.bindEnvironment(() => {
                const ordersCol = STAGING_DB.collection('orders')
                let orders = []

                const ordersCursor = ordersCol.find({$and: [{user: user._id}, {$where: 'this.vibes.length > 0'}]})

                ordersCursor.on('data', (doc) => { orders.push(doc) })
                ordersCursor.once('end', Meteor.bindEnvironment(() => {

                  let owned = [],
                      shippedOrders = orders.filter((order) => { return order.shipped })

                  if (shippedOrders.length) {
                    orders.forEach((order) => {
                      if (order.catalog) {
                        order.catalog.forEach((item) => {
                          owned.push(item.catalogID)
                        })
                      }
                    })
                  }

                  orders = orders.filter((order) => { return !order.shipped })

                  if (orders.length) {
                    console.log('\n* ** *** ** *')
                    console.log('order for', user._id)
                    console.log(orders.length + ' unshipped orders')

                    orders = orders.sort((a, b) => {
                      return a.date > b.date
                    })

                    let oldestOrder = orders[0],
                        favArtists = user.questions.favArtists.split(', '),
                        matches = []

                    // 1st degree match
                    favArtists.forEach((favArtist) => {
                      upsellRecords.forEach((upsellRecord) => {

                        if (favArtist.toLowerCase() == upsellRecord.related.spotifyName.toLowerCase()) {
                          let matched = matches.filter((match) => {
                            return upsellRecord._id == match._id
                          })
                          if (!matched.length && owned.indexOf(upsellRecord.id) == -1) {
                            matches.push({
                              _id: upsellRecord._id,
                              degrees: 1,
                              related: [upsellRecord.related.spotifyName]
                            })
                          }
                        }

                      })
                    })

                    favArtists.forEach((favArtist) => {
                      upsellRecords.forEach((upsellRecord) => {

                        let relatedSpotifyArtists = upsellRecord.related.spotifyArtists,
                            relatedOfRelateds = upsellRecord.related.relatedOfRelated

                        // 2nd degree match
                        relatedSpotifyArtists.forEach((relatedSpotifyArtist) => {
                          if (favArtist.toLowerCase() == relatedSpotifyArtist.name.toLowerCase()) {
                            let matched = matches.filter((match) => {
                              return upsellRecord._id == match._id
                            })
                            if (!matched.length && owned.indexOf(upsellRecord.id) == -1) {
                              matches.push({
                                _id: upsellRecord._id,
                                degrees: 2,
                                related: [relatedSpotifyArtist.name, upsellRecord.related.spotifyName]
                              })
                            }
                          }
                        })

                        // 3rd degree match
                        relatedOfRelateds.forEach((relatedOfRelated) => {
                          if (favArtist.toLowerCase() == relatedOfRelated.spotifyName.toLowerCase()) {
                            let matched = matches.filter((match) => {
                              return upsellRecord._id == match._id
                            })
                            if (!matched.length && owned.indexOf(upsellRecord.id) == -1) {
                              matches.push({
                                _id: upsellRecord._id,
                                degrees: 3,
                                related: [relatedOfRelated.spotifyName, relatedOfRelated.because, upsellRecord.related.spotifyName]
                              })
                            }
                          }
                        })

                      })
                    })

                    console.log(matches.length + ' matches')
                    console.log(matches)

                    if (matches.length) {

                      // looking for oldest unheld order to save the matches
                      let oldestUnheldOrder = false

                      for (let i = 0; i < orders.length; i++) {
                        const order = orders[i]
                        if (!oldestUnheldOrder && !order.holded) {
                          oldestUnheldOrder = order
                          continue
                        }
                      }

                      // delete old recommendations - multi just in case
                      ordersCol.update({_id: user._id}, {$unset: {recommendations: ''}}, {multi: true})

                      if (oldestUnheldOrder) {
                        ordersCol.update({_id: oldestUnheldOrder._id}, {$set: {recommendations: matches}})
                        console.log('saved ' + matches.length + ' match(es) to order ' + oldestUnheldOrder._id)
                      }

                    }

                    console.log('* ** *** ** *')

                  }

                }))
              }), index * 500)

            })

          }))

        }))

      }))
    }
})
