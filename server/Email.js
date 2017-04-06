import createsend from 'createsend-node';
import Spotify from './Spotify'
var auth = {apiKey: Meteor.settings.campaignMonitor.key};
var api = new createsend(auth);
var sinceYesterday = new Date(new Date() - (60 * 60 * 1000) * 24);
var ninetyDays     = new Date(new Date() - (60 * 60 * 1000) * (24 * 90));

Meteor.methods({
  'check':function(){
    console.log('auth: ', auth)
    console.log('api: ', api)
  },

  ///// *******   DEPRICATED   ******* /////
  'sendRecommendEmails':function(){
      var future      = new Future();
      var count       = 0;
      var emailsSent  = 0;

      // /ZWTYTqpMaEH2yHp8z
      // var d     = Recommend.find({'user_id':'RSMu4PedCsoG9tuNr'}).fetch();
      // only send emails to users in the US and that have inventory in their array
      var d    = Recommend.find({$and: [{'inventoryMatches':{$ne:[]}},{'countryCode':'US'}]}).fetch();
      console.log('dailyEmailList: ', d.length)
      d.forEach(function(recommendation){
          count++
          console.log('i: ', count, ' out of ', d.length);
          console.log('Sending recommendation email for: ', recommendation.user_email);
          // var url = Meteor.settings.customStoreUrl + recommendation.user_id;
          var url = 'https://my.vnyl.org/wishlist/' + recommendation.user_id;

          var firstName     = recommendation.full_name.split(' ');
          var data          = {
              subject: ', ' + firstName[0],
              custom_url: url,
              guest_name: firstName[0],
              item_one: {
                image: '',
                artist: '',
                album: ''
              },
              item_two: {
                image: '',
                artist: '',
                album: ''
              },
              item_three: {
                image: '',
                artist: '',
                album: ''
              }
          }
          var future        = new Future();
        // grab ids from activity to query images
          var activity  = SpotifyActivity.findOne({'user_id':recommendation.user_id});
          var sort = _.sortBy(activity.latestAlbums, 'added_at').reverse()
          console.log('activity latestAlbums', sort[0])
          console.log('check most recent: ', !_.isUndefined(activity.mostRecent))
              // if no most recent activity don't send
              if(!_.isUndefined(activity.mostRecent)){
                  // don't send if activity is > 90 days old
                  // if(new Date(sort[0].added_at) > ninetyDays) {
                  // inventory images to embed in email
                      var items    = Inventory.find({'_id' : { $in: activity.mostRecent }}).map(function(inventory){
                          if(!_.isUndefined(inventory.images)){
                              if(!_.isUndefined(inventory.images.spotify)){
                                  // console.log('inventory: ', inventory)
                                  var obj = {
                                    image: inventory.images.spotify,
                                    artist: inventory.artist,
                                    album: inventory.album
                                  }
                                  return obj;
                              }
                          }
                      })
                      console.log('items: ', items)

                      // loop through each image and attach to data obj
                      var i = 0;
                      console.log('i inside images: ', i)
                      items.forEach(function(item){
                          // console.log('image: ', item)
                          if(!_.isUndefined(item)){
                            i++;
                            switch (i) {
                                case 1:
                                    data.item_one   = item;
                                    break;
                                case 2:
                                    data.item_two  = item;
                                    break;
                                case 3:
                                    data.item_three = item;
                                    break;
                            }
                          console.log('data: ', data)
                          }
                      })

                      // log what inventory has been emailed to the user to prevent duplicates
                      if(!_.isUndefined(activity.sentInventory)){
                        console.log('no existing sent email inventory')
                          sentInventory = activity.sentInventory.concat(activity.mostRecent);
                      } else {
                        console.log('email inventory sent before')
                          sentInventory = mostRecent;
                      }

                      // Send the smart email(and provide a callback function that takes an error and a response parameter)
                      var details = {
                        smartEmailID: "f999f1e8-6fb9-4ee9-9b5b-ccd43b0c9b2c",
                        to: recommendation.user_email,
                        data: data
                      };

                      api.transactional.sendSmartEmail(details, (err, res) => {
                        emailsSent++
                        console.log('# emails sent: ', emailsSent)
                        if (err)  console.log(err);
                      });


                      // save last time recommendation email was sent
                      Recommend.update({_id:recommendation._id}, {$set:{'email_sent':dateNow}})
                      SpotifyActivity.update({_id:activity._id}, {$set:{'sentInventory':sentInventory}})
                  // }

              };
      })


      if(count === d.length){
        future.return(console.log('done'))
      }

      return future.wait()
  },
  ///// ******* END DEPRICATED ******* /////

  'sendSingleRecommendEmail':function(activity, recommendation, sent){
      console.log('*** Contructing Email for ', activity.user_email, ' ***')
      var future        = new Future();
      var today         = new Date()
      var url           = 'https://my.vnyl.org/wishlist/' + recommendation.user_id;
      // var url           = 'http://localhost:3000/wishlist/' + recommendation.user_id;
      var emailsSent    = 0;
      var firstName     = recommendation.full_name.split(' ');
      var data          = {
          subject: ', ' + firstName[0],
          custom_url: url,
          unsubscribe: url + '?action=unsubscribe',
          guest_name: firstName[0],
          item_one: {
            image: '',
            artist: '',
            album: ''
          },
          item_two: {
            image: '',
            artist: '',
            album: ''
          },
          item_three: {
            image: '',
            artist: '',
            album: ''
          }
      }

      // grab ids from activity to query images
          if(!_.isUndefined(activity.mostRecent)){
              // inventory images to embed in email
              var items    = Inventory.find({'_id' : { $in: activity.mostRecent }}).map(function(inventory){
                  if(!_.isUndefined(inventory.images)){
                      if(inventory.images.spotify != null){
                          var obj = {
                            image: inventory.images.spotify,
                            artist: inventory.artist,
                            album: inventory.album
                          }
                          return obj;
                      }
                  }
              })
              // loop through each image and attach to data obj
              var i = 0;
              if(!_.isUndefined(items) && items.length > 0){
                  items.forEach(function(item){
                        i++;
                        switch (i) {
                            case 1:
                                data.item_one   = item;
                                break;
                            case 2:
                                data.item_two  = item;
                                break;
                            case 3:
                                data.item_three = item;
                                break;
                        }
                  })

                    // smartEmailID: "09bdb3a5-d942-4068-9c41-bf7f8c371bbd", // fake email
                  var details = {
                    smartEmailID: "f999f1e8-6fb9-4ee9-9b5b-ccd43b0c9b2c", // real email
                    to: recommendation.user_email,
                    data: data
                  };

                  // Send the smart email(and provide a callback function that takes an error and a response parameter)
                  api.transactional.sendSmartEmail(details, (err, res) => {
                    emailsSent++
                    console.log('SENT')
                    if (err)  console.log(err);
                  });

                  // log what inventory has been checked for images and/or emailed to the user to prevent duplicates
                  // sentInventory = activity.sentInventory.concat(activity.mostRecent);
                  // console.log('sentInventory: ', sentInventory)

                  // save last time recommendation email was sent
                  Recommend.update({'user_email':recommendation.user_email}, {$set:{'email_sent':today}})
                  SpotifyActivity.update({'user_email':recommendation.user_email}, {$set:{'sentInventory':activity.sentInventory}})
              } else {
                console.log('No Email Sent')
              }
          };
  }

})


