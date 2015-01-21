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

If you would like to only use a particular component (i.e. login or signup), then you only need to include the minified version of the webcomponents script together with the corresponding component code, and then use the html tag in your page. For example, let's say you only want to use the signup component:

```
<html>
<head>
	<script src="//cdnjs.cloudflare.com/ajax/libs/polymer/<version>/webcomponents.min.js"></script>
	<link rel="import" href="signup.html">
</head>
<body>
	<webid-signup></webid-signup>
</body>
</html>
```

Listening for authentication events
-----------------------------------

The login component currently authenticates users through WebID-TLS. Once the authentication has been performed, a CustomEvent function is used to trigger and propagate the auth outcome to the parent window. Here is the structure of the ```WebIDAuth``` event object:

```
WebIDAuth : { details: { 
						auth: string, // type of auth method (i.e. WebID-TLS)
						success: bool, // true if auth was successful
						user: string // the WebID of the user
					}
			}
```


To listen to the event, one can add a very simple event listener in the document that uses the login component:

```
<html>
<head>
	<script src="//cdnjs.cloudflare.com/ajax/libs/polymer/<version>/webcomponents.min.js"></script>
	<link rel="import" href="login.html">
</head>
<body>
	<webid-login></webid-login>
	<script>
		// Listen to WebIDAuth events
		window.addEventListener('WebIDAuth',function(e) {
			console.log(e.detail);
			if (e.detail.success === true) {
				console.log("Auth successful! WebID: "+e.detail.user);
			} else {
				console.log("Auth failed!");
				console.log(e.detail);
			}
		},false);
	</script>
</body>
</html>
```
