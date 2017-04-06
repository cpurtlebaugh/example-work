Template.email.onCreated( () => {

});

Template.email.events({
  'click .fire-emails'(event) {
    console.log('firing send emails')
    event.preventDefault();

    Meteor.call('getAllUsersSavedTracks', function(err, res){
        if(err){
            console.log('err: ', err)
        } else {
            console.log('res: ', res)
        }
    });
  }
});
