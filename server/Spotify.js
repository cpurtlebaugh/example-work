import underscore from 'underscore';
import topSpenders from './data/topSpenders';
Future = Npm.require('fibers/future');

Meteor.methods({

  // **********************************************************//
  // ** FUNCTIONS TO CONNECT TO MY.VNYL DB TO GRAB USER DATA **//
  // **********************************************************//
  // http://mongodb.github.io/node-mongodb-native/2.0/tutorials/streams/
  'getUsers': function () {
      var future  = new Future();
      var col     = STAGING_DB.collection('users');
      var arr     = [];
      console.log('grabbing user data from vnyl db')
      // Get the results using a find stream
      // var cursor = col.find({$and:[{'services.spotify.accessToken':{$exists:true}}, {'stripe.subscription.status':{$exists:true}}]});
      var cursor = col.find({'services.spotify.accessToken':{$exists:true}});
      cursor.on('data', function(doc) {
          // console.log(doc._id);
          arr.push(doc)
      });

      cursor.once('end', function() {
        console.log('done')
        future.return(arr)
      });

      return future.wait();
  },

  'getSingleUser':function(id){
      console.log('get single user')
      var future  = new Future();
      var col     = STAGING_DB.collection('users');
      var user;

      // Get the results using a find stream
      var cursor = col.find({'_id':id});
      cursor.on('data', function(doc) {
          console.log(doc._id);
          user = doc
      });

      cursor.once('end', function() {
        console.log('done')
        future.return(user)
      });

      return future.wait();
  },

  'getArrOfUsers':function(array){
      console.log('arr in get arr of user ids:', array.length)
      var future  = new Future();
      var col     = STAGING_DB.collection('users');
      var arr     = [];
      console.log('grabbing user data from vnyl db')
      // Get the results using a find stream
      var cursor = col.find({'_id' : { $in: array }});
      cursor.on('data', function(doc) {
          arr.push(doc)
      });

      cursor.once('end', function() {
        console.log('done')
        future.return(arr)
      });

      return future.wait();
  },

  'getArrOfUserEmails':function(array){
      console.log('arr in get arr of user emails: ', array.length)
      var future  = new Future();
      var col     = STAGING_DB.collection('users');
      var arr     = [];
      console.log('grabbing user data from vnyl db')
      // Get the results using a find stream
      var cursor = col.find({'emails.0.address' : { $in: array }});
      cursor.on('data', function(doc) {
          arr.push(doc)
      });

      cursor.once('end', function() {
        console.log('done')
        future.return(arr)
      });

      return future.wait();
  },

  // *****************************************************************//
  // ** FUNCTIONS TO CHECK SPOTIFY ACTIVITY AND RUN AGAINST DISCOGS **//
  // *****************************************************************//

  // call from client side to check if spotify activity exists for a particular user
  'getSpotifyActivity': function (email) {
      console.log('Get activity for: ', email)
      var f = new Future();
      var activity = SpotifyActivity.findOne({user_email: email});
          if (activity) {
            var inventory = Meteor.call('checkWarehouse', activity);
            f.return(inventory);
          }
          var inventory       = f.wait();
          var finalInventory  = Meteor.call('checkIfDiscogsExists', activity.user_id, inventory);
          var discogsWantlist = Meteor.call('getUserWantList', activity.user_id);

      return activity && finalInventory ? {activity: activity, inventory: finalInventory, discogsWantlist: discogsWantlist} : null;
  },

  // general code to grab user saved albums data, less effective than tracks
  'getSavedAlbums':function(userId){
      console.log('firing get saved albums')
      var future = new Future();
      var user = Meteor.users.findOne({_id:userId});

      var spotifyApi = getSpotifyApiObj(user);
      spotifyApi.getMySavedAlbums({},function(err,response){
          if (err){
              future.throw(err);
          }
          else {
              // console.log('response: ', response)
              var albums = response.body.items;
              finalAlbums = getAlbums(albums);
              // console.log('final track inside final tracks: ', finalAlbums)
              future.return(finalAlbums);
          }
      });
      return future.wait()
  },

  // get saved tracks for a single user
  'singleUserSavedTracks':function(userId){
      console.log('getting single users saved tracks')

      var user = Meteor.call('getSingleUser', userId)
          user.liveRequest = true;

      return grabTracks(user)
  },

  'getTopSpenders':function(){
      console.log('firing get top spenders')
      var i               = 0;
      var top             = topSpenders.topSpenders;
      var spenders        = Meteor.call('getArrOfUserEmails', top)
      var totalCount      = spenders.length;
      var activityArr     = SpotifyActivity.find({}, {"user_email":1, '_id':0}).map(function(activity){
          return activity.user_id;
      });
      console.log('activity length: ', activityArr.length)
      var userIds         = spenders.map(function(user){
          return user._id;
      });
      var difference      = _.difference(userIds, activityArr);
      var finalUsers      = Meteor.call('getArrOfUsers', difference)
      console.log('final users: ', finalUsers.length)

      for(const value of finalUsers) {
          i++
          console.log('i: ', i)
          if(!_.isUndefined(value.services.spotify)){
              grabTracks(value)
          }
      }
  },

  // method to run as cron to check specific existing user's who don't have spotify activity saved
  'getAllUsersSavedTracks':function(){
      console.log('firing get saved tracks')
      let i               = 0;
      let c               = 0;
      let startTime       = new Date();
      let cutoffTime      = startTime.addMin(54);
      let oneWeek         = oneWeekFromNow();
      let emailUsersChk   = Recommend.find({'updated_at':{$gte:new Date(oneWeek)}}, {'user_id': 1, '_id': 0}).map(function(doc){
          return doc.user_id;
      });
      let allUsers        = Recommend.find({}).map(function(doc){
          return doc.user_id;
      });
      let spotifyUsers    = Meteor.call('getUsers');
      console.log('spotty length: ', spotifyUsers.length)

      let finalUsers = [];
      spotifyUsers.forEach(function(user){
          i++
          if(!_.contains(emailUsersChk, user._id)) {
            // console.log('hasnt receive an email in 1 week')
            finalUsers.push(user);
          } else if (!_.contains(allUsers, user._id)) {
            // console.log('returning user, no data exists')
            finalUsers.push(user);
          } else {
            // console.log('already exists and email sent in last week')
          }
      });

      console.log('# of final users: ', finalUsers.length)

      for(const value of finalUsers) {
          c++
          var currentTime = new Date();
          console.log('cutoffTime: ', cutoffTime, 'vs currentTime: ', currentTime)
          console.log('evaluation: ', currentTime > cutoffTime)
          console.log('count: ', c)
          if(currentTime > cutoffTime) {
            console.log('breaking loop - cron will restart in 5 min')
            break
          } else {
            if(!_.isUndefined(value.services.spotify)){
                grabTracks(value)
            }
          }
      }
  },

  // ********************************************//
  // ** FUNCTIONS TO ADD DATA TO EXISTING DATA **//
  // ********************************************//
  'addRecommendations':function(){
      // grab all existing spotify documents and check if it exists in recommendations
      var count       = 0;
      var activityIds = SpotifyActivity.find({}).map(function(activity){return activity.user_id});
      console.log('activityIds: ', activityIds.length)
      var activity    = SpotifyActivity.find({'user_id':{$in: activityIds}}).fetch()
      var users       = Meteor.call('getArrOfUsers', activityIds);

      activity.forEach(function(activity){
        count++
          console.log('i: ', count)
          var u = users.filter(function(user){
              if(user._id === activity.user_id) {
                return user
              }
          });
          console.log('u0: ', u[0]._id)
          saveRecommendations(activity, u[0])
      })
  },

  'addSentInventory':function(){
    console.log('firing add sent inventory')
      let allData = SpotifyActivity.find({'mostRecent':{$exists:true}}).fetch()
      let i       = 0;

      for (let doc in allData){
        i++
        let d = allData[doc]
        console.log('count: ', i)
        console.log('id: ', d._id)
        let sentInventory = d.mostRecent;
        console.log('sentInventory: ', sentInventory)
        SpotifyActivity.update({_id:d._id}, {$set: {'sentInventory':sentInventory}})
      }
  },

  // add user name, and country code to existing documents
  'addUserDataToRecommendations':function(){
      var count = 0;
      var recommendIds = Recommend.find({}).map(function(user){
          return user.user_id
      })
      var allUsers     = Meteor.call('getArrOfUsers', recommendIds)
      // var allUsers = a.splice(1, 20)

      allUsers.forEach(function(user){
          console.log('user name', user.profile.fullname)
          console.log('user country code', user.profile.shippingAddress.country)
          var country = user.profile.shippingAddress.country;
          if(country == undefined){
            country = 'US'
          }
          Recommend.update({user_id:user._id}, {$set:{'full_name':user.profile.fullname, 'countryCode':country}})

      })
  },

  'fixPastDiscogCheckdata':function(){
      var since           = new Date(new Date() - (60 * 60 * 1000) * 24 * 9);
      var userIds         = [];
      var count           = 0;
      var missedDiscogs   = SpotifyActivity.find({$and : [{'updated_at' : {$gte:since}}, {'updated':{$ne:true}}]}).map(function(activity){
          userIds.push(activity.user_id)
          return activity
      });
      console.log('userIds: ', userIds.length)
      console.log('missedDiscogs: ', missedDiscogs.length);

      var arrOfUsers = Meteor.call('getArrOfUsers', userIds)
      console.log('arr of users: ', arrOfUsers.length)

      arrOfUsers.forEach(function(user){
        count++
        if(!_.isUndefined(user.services.spotify)){
            console.log('i: ', count)
            grabTracks(user)
        }
      })
  },

  'sortAllSpotifyActivity':function(){
      var count    = 0;
      var activity = SpotifyActivity.find({'mostRecent':{$exists:false}}).fetch();
      console.log('activity length: ', activity.length)
      // var a        = activity.slice(1, 10)
      activity.forEach(function(activity){
          count++
          console.log('count: ', count)
          console.log('activity id: ', activity._id)

          var sort = _.sortBy(activity.latestAlbums, 'added_at').reverse();
          var test = { 'latestAlbums':sort };
          var mostRecent = Meteor.call('checkWarehouse', test).map(function(recent){
              return recent._id
          }).slice(0, 3);
          console.log('activity id: ', activity._id)
          console.log('most Recent: ', mostRecent)
          SpotifyActivity.update({_id:activity._id}, {$set:{'latestAlbums':sort, 'mostRecent':mostRecent}});
      })
  },

  'sortSpotify':function(){
      var activity = SpotifyActivity.findOne({'user_email':'casper+2@vnyl.org'});
      console.log('activity before: ', activity.latestAlbums.length)
      var sort = _.sortBy(activity.latestAlbums, 'added_at').reverse()
      console.log('sort: ', sort.length)
      SpotifyActivity.update({_id:activity._id}, {$set:{'latestAlbums':sort}});
  },

  // ********************************************//
  // ************** TEST FUNCTIONS **************//
  // ********************************************//
  'testSpotify':function(){
      console.log('get top artists')
      var future = new Future();
      var user   = Meteor.call('getSingleUser', 'RSMu4PedCsoG9tuNr');
      console.log('user: ',user)
      var spotifyApi = getSpotifyApiObj(user);

      spotifyApi.getMyTopTracks({}, function(err,response){
            if (err){
                console.log('err: ', err)
            }
            else {
                console.log('response: ', response.body)
            }
      });

      // currentReleases = future.wait();
  },

  'testGetAllUsersSavedTracks':function(){
      console.log('firing get saved tracks')
      var i               = 0;
      /// TEST DATA
      var users = ['RSMu4PedCsoG9tuNr']
      // var users     = ['RSMu4PedCsoG9tuNr', '5J5wWBnjXXBtAwGSq', 'GrXhS48asXnKmQJSp', 'nvtfQqDHXMacyvkFx', 'tarXxMi3bMSvytPC3'];
      var finalUsers =  Meteor.call('getArrOfUsers', users)
      var startTime = new Date();
      /// END TEST DATA

      for(const value of finalUsers) {
          var currentTime = new Date();
          i++
          console.log('i: ', i)
          if(!_.isUndefined(value.services.spotify)){
              grabTracks(value)
          }

      }
  },

  'testCall':function(){
    console.log('***********************')
    console.log('LINE BREAK')
    console.log('***********************')
    var test = SpotifyActivity.find({}).fetch();
    console.log('SpotifyActivity length: ', test.length)
    console.log('top spenders 1: ', topSpenders.topSpenders[0])
  }
});

  // ********************************************//
  // ************** HELPING FUNCTIONS **************//
  // ********************************************//

  // grab tracks for a specific user as many times as necessary until an empty arr is yielded
  grabTracks  = function(user){
    // console.log('user: ', user)
      console.log('Firing get saved tracks for ' + user._id)
      var userCheckCount  = 0;
      var spotifyApi = getSpotifyApiObj(user);
      var limit  = 50;
      var offset = 0;
      var total  = [];
      var params = {
        limit: limit,
        offset: offset
      };

      // call spotify up to 10x to grab user saved track data
      for (i = 0; i < 10; i++) {
          var future = new Future();
          userCheckCount += 1;
          console.log('# of api calls for ', user.emails[0].address, ' ', userCheckCount)

          spotifyApi.getMySavedTracks(params,function(err,response){
                if (err){
                    console.log('err: ', err)
                    finalTracks = null;
                    future.return(finalTracks);
                }
                else {
                    var tracks      = response.body.items;
                    var finalTracks = getItems(tracks);
                    future.return(finalTracks);
                }
          });

          // once spotify tracks response arrives, if arr is empty stop or else keep calling
            var arr = future.wait();
            if(arr === null) {
                console.log('err in get tracks, final tracks yeild null')
                delay(2000)
                break
            } else if(arr.length === 0){
                delay(2000)
                break
            } else {
                total = arr.concat(total);
                offset += 51;
                params = {limit:limit, offset:offset};
                delay(2000)
            }
      }

      console.log('Spotify Trck Arr Length: ', total.length)
      if(total.length > 0) {
          var f         = new Future();
          var checked   = new Date();
          var activity  = _.sortBy(total, 'added_at').reverse();
          // data to save to the spotify activity document
          var activity = {
            'user_id':user._id,
            'user_email': user.emails[0].address,
            'latestAlbums': activity,
            'updated_at': checked
          };

          if(arr != null){
              if(arr.length === 50) {
                console.log('hyperactive user')
                activity.hyperactiveUser = true;
              }
          }

          var inventory = Meteor.call('checkWarehouse', activity);
          console.log('Inventory length: ', inventory.length)
          f.return(inventory)
          var ready = f.wait();
          var data  = [activity];

         // get data for personal recommendations document
          if(ready){
              // exclude inventory matches if already exists in discogs
              alreadyHas      = Meteor.call('checkIfDiscogsExists', user, inventory);
              // save id's only in recommendations doc
              inventoryIds    = alreadyHas.map(function(item){
                  return item._id
              });

              // insert user country and full name into recommendations
              var country;
              if(!_.isUndefined(user.profile.shippingAddress)) {
                  if(user.profile.shippingAddress.country == undefined){
                    country = 'US'
                  } else {
                    country = user.profile.shippingAddress.country;
                  }
              }

              recommendations = {
                'user_id':user._id,
                'user_email': user.emails[0].address,
                'inventoryMatches': inventoryIds,
                'full_name':user.profile.fullname,
                'countryCode':country,
                'updated_at':checked
              };

              // seperately check for want list, add as a seperate field in recommendations doc
              if(!_.isUndefined(user.services.discogs)) {
                      console.log('discogs exists', )
                  if(!_.isUndefined(user.services.discogs.accessToken)){
                      console.log('discogs accessToken: ', user.services.discogs.accessToken)
                      var fut = new Future();
                      recommendations.discogsWantlist = Meteor.call('getUserWantList', user)
                      fut.return(recommendations.discogsWantlist)
                      var done = fut.wait()
                      if(done){
                          data.push(recommendations)
                          saveData(data, user)
                      }
                  } else {
                    console.log('no discogs accessToken')
                    data.push(recommendations)
                    saveData(data, user)
                  }
              } else {
                console.log('discogs doesnt exist')
                data.push(recommendations)
                saveData(data, user)

              }
          } else {
              saveData(data, user)
          }
      }
  };

  // ACTIVE SAVE DATA FX()
  // function to save data to spotifyactivity, recommend and user documents
  saveData    = function(data, user){
      console.log('Save Data Length: ', data.length)
      var existingData          = SpotifyActivity.findOne({user_id:user._id});
      var dateNow               = new Date();
      var i                     = 0;

      // if req is generated from my.vnyl don't send email
      if(_.isUndefined(user.liveRequest)) {
          var mostRecent = [];
          var firstItemInMostRecent = [];

          let matches = data[1].inventoryMatches;
          for (let data in matches){
            i++
            if(mostRecent.length === 3){
                break
            } else {
                if(_.isUndefined(existingData)){
                    console.log('existing data is undefined')
                    mostRecent = matches.splice(0,3)


                } else {
                    if(!_.contains(existingData.sentInventory, matches[data])){
                       mostRecent.push(matches[data])
                    }
                }
            }
          }
      // set most recent and sentInventory data onto data arr index so visible in email function
          data[0].mostRecent    = mostRecent;
          if(_.isUndefined(existingData)){
            data[0].sentInventory = mostRecent
          } else {
            if(_.isUndefined(existingData.sentInventory)){
                var sentInventory     = [];
                data[0].sentInventory = sentInventory.concat(mostRecent)

            } else {
                data[0].sentInventory = existingData.sentInventory.concat(mostRecent)
            }
          }

        // check if user has opted out of wishlist emails
          if(!_.isUndefined(existingData)) {
              console.log('dns ', existingData.do_not_send != true)
              if(existingData.do_not_send != true) {
                console.log('existingData is defined but no dns flag')
                Meteor.call('sendSingleRecommendEmail', data[0], data[1])
                Meteor.call('sendSlackDM', data[0], data[1], user)
              }
          } else {
              console.log('sending because existingData is undefined')
              Meteor.call('sendSingleRecommendEmail', data[0], data[1])
              Meteor.call('sendSlackDM', data[0], data[1], user)
          }

      } else {
          console.log('live req, no email to be sent')
      }
    // check if spotify and recommend activity exist or not
      if(existingData === undefined){
          console.log('*** Saving Activity ***')
          SpotifyActivity.insert(data[0])
          if(data.length === 2){
              Recommend.insert(data[1])
          }
      } else {
          console.log('*** Updating Activity ***')
          SpotifyActivity.update({user_id:user._id}, {$set:{'latestAlbums':data[0].latestAlbums, 'updated_at':dateNow, 'mostRecent':data[0].mostRecent,'updated':true}});
          if(data.length === 2){
              Recommend.update({user_id:user._id}, {$set:{'inventoryMatches':data[1].inventoryMatches, 'updated_at':dateNow, 'countryCode':data[1].countryCode, 'full_name':data[1].full_name,'updated':true}})
          }
      }
  };

  // saveD       = function(recommendations, user){
  //     console.log('save recommendations')
  //     Recommend.insert(recommendations)
  // };

  // saveRecommendations = function(activity, user){
  //     var f = new Future();
  //     console.log('In save recommendations')
  //     var inventory = Meteor.call('checkWarehouse', activity);
  //     f.return(inventory)
  //     var ready = f.wait();
  //     if(ready){
  //         // exclude inventory matches if already exists in discogs
  //         var alreadyHas      = Meteor.call('checkIfDiscogsExists', user, inventory);
  //         var inventoryIds    = alreadyHas.map(function(item){
  //             return item._id
  //         });

  //         var recommendations = {
  //           'user_id':user._id,
  //           'user_email': user.emails[0].address,
  //           'inventoryMatches': inventoryIds,
  //           'updated_at': new Date()
  //         };

  //         if(!_.isUndefined(user.services.discogs)) {
  //             console.log('discogs exists', )
  //             if(!_.isUndefined(user.services.discogs.accessToken)){
  //                 console.log('discogs accessToken: ', user.services.discogs.accessToken)
  //                 var fut = new Future();
  //                 recommendations.discogsWantlist = Meteor.call('getUserWantList', user)
  //                 fut.return(recommendations.discogsWantlist)
  //                 var done = fut.wait()
  //                 if(done){
  //                     saveD(recommendations, user)
  //                 }
  //             } else {
  //                 console.log('no discogs accessToken')
  //                 saveD(recommendations, user)
  //             }
  //         } else {
  //             console.log('discogs doesnt exist')
  //             saveD(recommendations, user)
  //         }
  //     }
  // };

  // if item was added in less than 24 hours on Spotify,
  // push to arr to check to send request to inventory server
  getItems    = function(items){
      arr = [];
      items.forEach(function(item) {
        if(checkTime(item)){
          var newTrack = {
            artist_name: item.track.artists[0].name,
            track_name: item.track.name,
            album_name: item.track.album.name,
            track_id: item.track.id,
            added_at: item.added_at
          };
          if(!addTrack(item.track.album.name)){
            arr.push(newTrack)
          }
        }

      })
      return arr;
  };

  // check if the album exists
  albumExists = function(albumName) {
      return arr.some(function(obj){
        return obj.album_name === albumName
      })
  };

  // add album function
  addTrack    = function(albumName){
      if(albumExists(albumName)){
        return true
      } else {
        return false
      }
  };

  // check if the item was added over 24 hours ago
  checkTime   = function(obj){
      var getDiff = new Date() - new Date(obj.added_at);
      var convertDiff = Math.ceil(getDiff / (1000*3600*24))
      if(convertDiff <= 3000){
        return true;
      }
  };

  // set delay counter for api call spacing
  delay       = function(milliseconds, params) {
      console.log('2 second delay')
      var start = new Date().getTime();
      for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
          break;
        }
      }
  }

  // 1 week in past from today
  oneWeekFromNow = function(){
      var days  = 7;
      var date  = new Date();
      var last  = new Date(date.getTime() - (days * 24 * 60 * 60 * 1000));
      return last.toISOString();
  }

  // renew refresh / access token for spotify
  getSpotifyApiObj = function(user){
      var spotifyApi = new SpotifyWebApi({
          'accessToken' : user.services.spotify.accessToken,
          'refreshToken' : user.services.spotify.refreshToken,
          'redirectUri' : 'https://my.vnyl.org/_oauth/spotify?close',
          'clientId' : Meteor.settings.spotify.clientId,
          'clientSecret' : Meteor.settings.spotify.secret
      });
      spotifyApi.prefixURI = "";

      var expires = user.services.spotify.expiresAt // milliseconds
      var timeLeft = expires - Date.now(); // milliseconds

      if (timeLeft < 600000) {
          console.log("token almost expires")
          var result = spotifyApi.refreshAccessToken();
          if (result.error == null){
              var data = result.data.body;
              var newexpiresAt = Date.now() + (data.expires_in * 1000);
              // Meteor.users.update({_id:user._id},{$set:{"services.spotify.accessToken":data.access_token,"services.spotify.expiresAt":newexpiresAt}});
              spotifyApi.setAccessToken(data.access_token);
          } else {
              console.log("Error renew :" + result.error);
          }

      }

      return spotifyApi;
  };

  Date.prototype.addMin= function(m){
    this.setMinutes(this.getMinutes()+m);
    return this;
  };
