# Zapier Backend Engineering Skills Interview

## Project Setup

Thanks for your willingness to take our Backend Engineering skills interview. At Zapier, we try to make the interviewing process as painless and transparent as possible. For engineering, we avoid whiteboarding sessions and quizzes on implementing red-black trees. Instead, we opt to provide a real world scenario and a small project for you to complete.

Before you begin the project, here are a few things you’ll need to set up:

### 1. Clone this repo

```bash
git clone https://github.com/zapier-interviews/yourreponame.git
cd yourreponame
```

Your repo will be named something like `interview-yourname-abc123`. Use the real repo name in place of `yourreponame`. Use SSH or HTTPS, whatever works for you.

### 2. Create a branch for your project

All work for the project should be done on a branch named `project`, and after completing your project, you'll create a pull request within Github to merge it to `main`.

```bash
git checkout -b project
```

### 3. Set up your environment

  1. Please choose either **Python,JavaScript/TypeScript, or Node.js** to use on your project. You can use any framework built on these but these options help us compare across submissions. 
  1. The project involves developing a web service API. If you have a favorite web framework you'd like to use, install it beforehand.
  1. The project involves writing tests. If you have a favorite test framework, install it beforehand.
  1. The project involves reading and writing data. You may choose any database or storage system you like (MySQL, Postgres, Redis, RocksDB, SQLite, etc.) and install it ahead of time.
  1. The project also involves building a library that is a client for the web service. Since the term "library" can mean different things depending on context and programming language, we've put together [this gist](https://gist.github.com/zapier-interviews/7c7e405d2b7b50e2b27c2ce6e04b9dc2) to show how we envision using your library. It has examples in a number of programming languages. Find the one you will use and look at the file. You won't need that code. It's there to help frame the solution for you. And we apologize if your language of choice isn't in there.

Your web service will need to interact with the database/storage system you choose, so you may setup a dummy endpoint to ensure everything is configured correctly and that you can do reads and writes from the web service.

### 4. Push your project setup to GitHub

Push your project setup to your private Zapier repo to make sure everything is working.

```bash
git add .
git commit -m "project setup"
git push -u origin project
```

If you're reading this file, everything should be fine with permissions. But, if for some reason this doesn't work, let us know!

### 4. Prepare for your project

Once you get your project, you can use any additional libraries or resources you like as long as that resource does not solve the problem for you completely.

### 5. Begin!

Head on over to the `PROJECT_SPEC.md` file for instructions on what you will be building. Best of luck!
