# Zapier Backend Engineering Skills Interview

## Project Details

Please consider this document as a set of requirements and deliver the code necessary to fulfill these requirements. If a requirement seems ambiguous, state your understanding of the requirements in the Pull Request description or inline comments along with your solution.

We use this project to understand how you break a problem down and solve it with code. Please **do not** submit a solution with code snippets you find on the internet as this does not help us understand your programming skill.

## Scenario

Your mission is to build a portion of a billing system for a fictional cloud service provider. You are on the billing team at this company and need to provide a system that allows other teams at the company to track usage for each customer.

## Deliverables

There are three deliverables for this project:

1. An internal web service API for tracking usage
1. A client library that implements the internal web service API. This would be the client used by other teams to interact with the API
1. A test suite to validate the web service and library work as expected

## Specs


### General

* Please use either **Python, JavaScript/TypeScript, or Node.js**.
* You may use any framework, such as a web framework or test framework, to help you complete the project.
* You may store the data for this system in any database you choose.
* You may model the data any way you'd like, including adding data beyond the samples provided.

### Web Service

* Your service should implement a single endpoint that accepts POST requests.
* Your service should record usage for a customer's current bill.
* Your service should handle edge cases appropriately and return appropriate HTTP status codes.
* Your service should have at least one test.

### Library

* Your library should be a client for the internal web service, implementing (sending requests to) the available endpoint. Here is the [gist with examples](https://gist.github.com/zapier-interviews/7c7e405d2b7b50e2b27c2ce6e04b9dc2) of how another team at your company would potentially use your library.
* Your library should be designed so the interaction between it and the web service is idempotent. Specifically, if a client retries the same request, the system shouldn't record duplicate usage (and thus overcharge customer).
* Your library should handle other edge cases appropriately (i.e. raising an exception or retrying requests).
* Your library should have at least one test.

## Sample Data

Below is some sample data you can use to populate your database. Feel free to extend or modify this data for your project:

Customers

```json
[
  {
    "id": 123,
    "name": "Alice"
  },
  {
    "id": 456,
    "name": "Bob"
  },
  {
    "id": 789,
    "name": "Taylor"
  }
]
```

Usage Records

```json
[
  {
    "customerId": 123,
    "service": "Database Hosting",
    "unitsConsumed": 58,
    "pricePerUnit": 0.05
  },
  {
    "customerId": 456,
    "service": "Load Balancer",
    "unitsConsumed": 27,
    "pricePerUnit": 0.03
  },
  {
    "customerId": 123,
    "service": "Linux Instance",
    "unitsConsumed": 42,
    "pricePerUnit": 0.15
  },
  {
    "customerId": 123,
    "service": "CDN Storage",
    "unitsConsumed": 15,
    "pricePerUnit": 0.02
  },
  {
    "customerId": 456,
    "service": "Domain Name Registration",
    "unitsConsumed": 1,
    "pricePerUnit": 14.99
  },
]
```

## Project Time Limit

We expect you to spend no more than about **2.5 hours** coding this exercise. We recognize that everyone has different work styles and other life commitments, and that doing an exercise like this is not a trivial investment of your time. You have the flexibility to work when and how you prefer. For example, you can do it in a single 2.5 hr block of time, or you can work on it in smaller chunks of time over the course of a couple days. To keep the process fair, you will not be rewarded if you spend excessive time on the exercise.

In addition to evaluating your code, we're evaluating your ability to prioritize and estimate your work. Code and app quality will be weighted a lot more. If you're unable to complete all requirements within a reasonable timeframe, include a brief plan outlining what's remaining, what order you'd tackle the remaining work, and a rough estimate of how much time you think it would take.

## AI Usage for This Assessment

As an AI orchestration platform and a company that is highly invested in the power of AI, we strongly encourage you to use AI tools to complete this assessment. The criteria of this assessment are unchanged and we’ll evaluate it based on what is shared below. Additionally, during the interview that follows this assessment, part of it will include a deeper dive into how you used AI to get a better understanding of your familiarity and application of AI tooling and approach to solving problems leveraging AI solutions. Whether you choose to use AI tools or not, be prepared to talk about how you can leverage AI solutions in the interview. 

Tools you may consider using or exploring:

* AI code editors
* GitHub Copilot or similar


## Once Finished

To deliver your project, you will create a pull request (see below) and email the URL to us (reply to the person that setup your interview).

Commit your final work and push to the `project` branch of the private GitHub repo provided by Zapier. 

Open a pull request to merge your `project` branch to `main`.

As part of the pull request, use the description and/or comments on the PR to tell us:

  * A description of your solution at a high-level, including language used, framework used, roughly how it works, etc.
  * What trade-offs you made
  * Any assumptions you made that affected your solution
  * What you would change if you built this for production
  * Brief instructions on how to setup the environment to run your project
  * What parts of the spec were completed, how much time you spent, and any particular problems you ran into
  * If you chose to use AI tools, which specific tools you leveraged, how you applied them, and a couple examples of the prompts you used

## How We'll Review Your Pull Request

Once complete, we'll review your pull request for:

* **Communication** - How effectively you communicate about code through the PR description, readme, and any comments.
* **Solution Design** - How you decided to solve this problem.
* **Completeness** - How much of the spec you were able to implement.
* **Clarity** - How well we can understand your code and the decisions you made in the implementation.
* **AI Utilization**:  How you used (or chose not to use) AI tools in your development process and why.

Note: While we are not concerned about any particular code style, we will be examining the readability of the code and looking for well applied coding standards. We understand this is a high pressure, time-boxed exercise. We are more interested in how you problem solve and communicate than write code that adheres to a particular style.
