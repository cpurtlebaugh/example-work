Router.route('/', function () {
      this.render('dashboard');
});

Router.route('/email', {
  name: 'email',
  controller:'EmailController'
});
