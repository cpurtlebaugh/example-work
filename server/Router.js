Router.route('/activity/:id', function(){
    var request       = this.request;
    var response      = this.response;
    var userId        = request.body.query;

    console.log('hitting spotify server')
    var future = new Future();
    var userInfo = Meteor.call('singleUserSavedTracks', request.body.query, function(err, res){
      if(err){
          console.log('err', err)
          future.throw(err)
      } else {
        if(res === undefined){
          console.log('res is undefined')
          future.return(true)
        } else {
          future.throw(err)
        }
        // future.return(res)
      }
    });
    var done = future.wait()

    if(done === true){
        response.end(JSON.stringify({
            results: {'done':done}
        }));
    }
}, {where:'server'});

Router.route('/unsubscribe/:id', function(){
    var request       = this.request;
    var response      = this.response;
    var userId        = request.body.query;
    var done          = false;
    console.log('User id: ', userId, ' has unsubscribed')
    SpotifyActivity.update({'user_id':userId}, {$set:{'do_not_send':true}}, function(err, res){
      if(err){
        console.log('err: ', err)
        response.end(JSON.stringify({
            results: {'done':done}
        }));
      } else {
        done = true;
        response.end(JSON.stringify({
            results: {'done':done}
        }));
      }
    })
}, {where:'server'});
