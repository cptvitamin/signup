Signup
=======

WebID login/singup application.

Runing live here: http://linkeddata.github.io/signup/

Quick Start
-----------

```
$ git clone git://github.com/linkeddata/signup
$ cd signup
$ sudo npm -g install bower
$ bower install
```

Individual Components
---------------------

If you would like to only use a particular component (i.e. login or signup), then you only need to include the minified version of the webcomponents script together with the corresponding component code, and then use the html tag in your page. For example, let's say you only want to use the login component:

```
<html>
<head>
	<script src="//cdnjs.cloudflare.com/ajax/libs/polymer/<version>/webcomponents.min.js"></script>
	<link rel="import" href="login.html">
</head>
<body>
	<webid-login></webid-login>
</body>
</html>
```
