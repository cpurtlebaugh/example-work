import underscore from 'underscore';
import request from 'request';

Meteor.methods({
  'checkIfDiscogsExists':function(user, inventoryMatches){
      console.log('*** Checking Discogs ***')
      var  u  = user;
      if(!_.isUndefined(u)){
          if(!_.isUndefined(u.services.discogs)){
              var discogsArray = Meteor.call('getUserDiscogsLibrary', u);
              inventoryMatches.map(function(match){
                  // console.log('match discogsId: ', match.discogsId)
                  var contains = discogsArray.some(function(obj){
                      if(!_.isUndefined(match.discogsId)){
                        if(match.discogsId === obj.discogs_id) {
                            console.log('user already has in discogs')
                            match.hasInDiscogs = true;
                        }
                      }
                  })

              });
          }
      }

      return inventoryMatches;
  },

  'getUserDiscogsLibrary':function(u){
      console.log('Firing get user discogs library')
      var f = new Future();
      // console.log('u inside get getUserDiscogsLibrary: ', u)
      var options = { method: 'GET',
          url: 'https://api.discogs.com/users/'+u.services.discogs.username+'/collection/folders/0/releases',
          headers:
          { 'User-Agent': 'vnyl',
          authorization: 'OAuth oauth_consumer_key="'+Meteor.settings.discogs.consumerKey+'",oauth_token="'+u.services.discogs.accessToken+'",oauth_signature_method="HMAC-SHA1",oauth_timestamp="'+Date.now()+'",oauth_nonce="'+Date.now()+'",oauth_version="1.0",oauth_signature="'+Meteor.settings.discogs.secret+'"' } };

      request(options, Meteor.bindEnvironment(function (error, response, body) {
          var body                = JSON.parse(body),
              existingDiscography = body.releases,
              discogsArray        = [];
          if(error){
            console.log('discogs library check err: ', error)
          } else {
            if(!_.isUndefined(existingDiscography)){
                console.log('Existing Discog Length: ', existingDiscography.length)
                existingDiscography.forEach(function(d){
                    var discog = {
                      'artist_name':d.basic_information.artists[0].name,
                      'album_name':d.basic_information.title,
                      'discogs_id':d.id
                    };
                    discogsArray.push(discog);
                });
            }

            f.return(discogsArray)
          }
      }));

      var discogsArray = f.wait();
      return discogsArray;
  },


  'getUserWantList':function(user){
      console.log('//////////////////////////')
      console.log('Firing get users want list')
      var u = user,
          f = new Future(),
          options = { method: 'GET',
          url: 'https://api.discogs.com/users/'+u.services.discogs.username+'/wants?page=1&per_page=500',
          headers:
          { 'User-Agent': 'vnyl',
          authorization: 'OAuth oauth_consumer_key="'+Meteor.settings.discogs.consumerKey+'",oauth_token="'+u.services.discogs.accessToken+'",oauth_signature_method="HMAC-SHA1",oauth_timestamp="'+Date.now()+'",oauth_nonce="'+Date.now()+'",oauth_version="1.0",oauth_signature="'+Meteor.settings.discogs.secret+'"' } };

      request(options, Meteor.bindEnvironment(function (error, response, body) {
          var body = JSON.parse(body);
          if(error){
              console.log('discogs library check err: ', error)
              f.return([]);
          } else {
              var wantList = [];
              if(!_.isUndefined(body.wants)){
              console.log('body wants length: ', body.wants.length)
                body.wants.forEach(function(item){
                    var albumExists = wantList.some(function(o){
                      // console.log('o: ', o)
                      return o["album_name"] === item.basic_information.title;
                    })
                    if (!albumExists) {
                        var item = {
                            'album_name': item.basic_information.title,
                            'artist_name': item.basic_information.artists[0].name,
                            'discogsId': item.id
                        }
                        wantList.push(item);
                    }
                })

              }
            f.return(wantList);
          }
      }));

      return f.wait()
  }

});

