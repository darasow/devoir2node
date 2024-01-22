const express = require('express');
const { engine } = require('express-handlebars');
const app = express();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const fs = require('fs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "views")))
app.use(express.static(path.join(__dirname, "public")))
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
const port = 3000;
var imageUser = ""

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const dest = 'public/images/';
      cb(null, dest);
    },
    filename: function (req, file, cb) {
      const extension = path.extname(file.originalname);
      imageUser = uuidv4() + extension
      cb(null, imageUser);
    },
  });
  const upload = multer({ storage: storage });

  app.use(session({
    secret: 'userData', // Clé secrète utilisée pour signer le cookie de l'ID de session
    resave: false, // Ne pas sauvegarder la session dans le magasin si elle n'a pas été modifiée
    saveUninitialized: true //// Enregistrer une session non initialisée dans le magasin
}));

app.get('/', async (req, res) => {
    try {
      // Création d'un tableau avec les données nécessaires (nom du pays et URL du drapeau)
      res.render('index');
    } catch (error) {
      console.error(error);
      res.status(500).send('Erreur interne du server');
    }
  });

app.get('/createAccount', (req, res) => {
    try {
      
      // Création d'un tableau avec les données nécessaires (nom du pays et URL du drapeau)
      res.render('createAccount');
    } catch (error) {
      console.error(error);
      res.status(500).send('Erreur interne du server');
    }
  });

app.get('/listeUser', (req, res) => {
    try {
      // Création d'un tableau avec les données nécessaires (nom du pays et URL du drapeau)
      var message = ""
      if(req.session.userData && req.session.userData.length === 0)
      {
       message = "Aucun utilisateur créer"
      } 
      res.render('listeUser', {users: req.session.userData, message : message});
    } catch (error) {
      console.error(error);
      res.status(500).send('Erreur interne du server');
    }
  });

  app.post('/submit/login', (req, res) => {
    // Traitement pour le formulaire 1
    var context
    const { username, password} = req.body;
    if (!username || !password) {
      context = {
        message: "Tout les champs sont obligatoires",
        username : username,
        password : password,
      }
     return res.status(400).render('index', context);  
   }
    const userExists = req.session.userData && req.session.userData.some(user => user.password === password && user.username === username);
    if(!userExists)
    {
      context = {
        message: "L'utilisateur n'existe pas",
        username : username,
        password : password,
      }
      return res.status(400).render('index', context); 
    }
    res.redirect('/listeUser');
});

  app.post('/submit/account',upload.fields([{ name: 'image', maxCount: 1}]),  (req, res) => {
    const image = imageUser;
    var context
    const { username, email, password, password_confirmation } = req.body;
    if (!username || !email || !password || !password_confirmation) {
        context = {
         message: 'Tous les champs sont obligatoires',
         username : username,
         email : email,
         password : password,
         password_confirmation : password_confirmation
       }
      return res.status(400).render('createAccount', context); 
     }
    if (password != password_confirmation) {
        context = {
         message: 'Les deux mots de passes ne sont pas identiques',
         username : username,
         email : email,
         password : password,
         password_confirmation : password_confirmation
       }
      return res.status(400).render('createAccount', context); 
     }
    const userExists = req.session.userData && req.session.userData.some(user => user.password === password || user.username === username || user.email === email);
    
    if (userExists) {
       context = {
        message: "Un utilisateur avec le même mot de passe ou nom d\'utilisateur ou email existe déjà",
        username : username,
        email : email,
        password : password,
        password_confirmation : password_confirmation
      }
      return res.status(400).render('createAccount', context); 
    }
    req.session.userData = req.session.userData || [];
    req.session.userData.push({ username, email, password, image });
    res.render('listeUser', { users: req.session.userData }, () => {
      res.redirect('/listeUser');
  });
});

app.get("/edit/:id", (req, res) =>{
     var userid = parseInt(req.params.id)
     var userExists = req.session.userData[userid] || null;
      if(userExists == null) 
      {
        res.render('listeUser', { message : "L'utilisateur n'existe pas" }, () => {
          res.redirect('/listeUser');
      });
      }
     const context = {
      username : userExists.username,
      email : userExists.email,
      image : userExists.image,
      userEdit : userid
     }
      res.render("edit", context)
})

app.post("/submit/edit",upload.fields([{ name: 'image', maxCount: 1}]),  (req, res) => {
  var image = null
  if (req.files && req.files['image'] && req.files['image'][0] && req.files['image'][0].filename) {
    image = req.files['image'][0].filename;
  }
  var context
  const { username, email, userEdit} = req.body;
  if (!username || !email) {
      context = {
       message: 'Tous les champs sont obligatoires',
       username : username,
       email : email,
       image : image,
       userEdit : userEdit
     }
    return res.status(400).render('edit', context); 
   }
   const userId = parseInt(userEdit)
   const userExists = req.session.userData.filter((user, index) => ((user.username === username) || (user.email === email)) && index !== userId)
   var user = req.session.userData[userId];
   if (userExists.length > 0) {
      context = {
       message: "Un utilisateur avec le même nom d\'utilisateur ou email existe déjà",
       username : username,
       email : email,
       image : user.image,
       userEdit : userEdit
     }
     return res.status(400).render('edit', context); 
   }
    if(image)
    {
      const oldImagePath = 'public/images/' + user.image;
    if (fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
    }
    user.image = image
    }
    user.username = username,
    user.email = email
  req.session.userData[userId] = user


  res.render('listeUser', { users: req.session.userData }, () => {
    res.redirect('/listeUser');
});
});

app.get("/delete/:id", (req, res) => {
   const id = parseInt(req.params.id)
   const user = req.session.userData[id]
   req.session.userData.splice(id, 1);

   const imagedeleted = 'public/images/' + user.image;
   if (fs.existsSync(imagedeleted)) {
     fs.unlinkSync(imagedeleted);
   }
   res.render('listeUser', { message : "Utilisateur supprimer avec succes" }, () => {
    res.redirect('/listeUser');
});
  
})


app.get("*", (req, res) =>{
  
   res.send("update")
})

  app.listen(port, () => {
    console.log(`Serveur démarré sur http://localhost:${port}`);
  });




