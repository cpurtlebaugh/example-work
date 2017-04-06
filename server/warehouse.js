Future = Npm.require('fibers/future');

Meteor.methods({
  // client-side search that pings vnyl warehouse for inventory matches
  checkWarehouse: function (query) {
      console.log('*** Checking Warehouse ***')
      var future  = new Future();
      var data  = {
        query:query.latestAlbums
      };

      var queryUrl = Meteor.settings.queryUrl;
      console.log('queryUrl: ', queryUrl)
          HTTP.get(queryUrl, {data:data}, function(err, res) {
              if(err){
                console.log('err: ', err)
                future.throw(err)
              } else {
                var r = JSON.parse(res.content);
                future.return(r.results)
              }
          });
      return future.wait();
  },

  // server call to respond to client-side csv file upload to send to vnyl warehouse
  parseUpload(data) {
      var uploadUrl = 'http://vnylwarehouse-92004.onmodulus.net/upload'
      check( data, Array );
      console.log('uploading ' + data.length + ' lines to warehouse server')

      HTTP.post(uploadUrl, {
        data: {
          records: JSON.stringify(data)
        }
      }, function (err, res) {
        if (err) {
          console.log(err)
        } else {
          console.log('sent data to warehouse server')
        }
      })
      return true;

  }
});
