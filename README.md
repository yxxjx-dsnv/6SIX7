# Introduction
Have you ever walked into a library only to realize that there is not single spot avaiable? Well, we've got a solution for you! 

Welcome to our "Campus Pulse"--a website where students can check how busy campus libraries are, viewing operating hours, and stay updated on important announcements, such as temporary closures. 

# Table of Contents
1. [Setup and Installation](#Setup-and-Installation)
2. [Pre-requisites](#Pre-requisites)
3. [Challenges and Solutions](#Challenges-and-Solutions)
   
# Setup and Installation
## Pre-requisites
- Node.js and npm installed.
- Development environment (ex. VS Code) installed. 
- Clone the respository to your local machine.
  
# Challenges and Solutions
## Method to Check Availability
After coming up with our idea, we have encountered a major challenge: "How can you check Availability?". 

We brainstormed several ways to estimate how many people were inside a building and on each floor. Our first idea was to use Wi-Fi connections, since most people carry electronic devices such as phones or laptops that connect to the campus network. However, this approach raised privacy concerns, so we decided not to pursue it.

Next, we considered tracking entries and exits using T-cards. This would only work in certain libraries, such as Gerstein and Robarts, where T-card access is required. Many other libraries do not require T-cards for entry, making this solution inconsistent.

After exploring numerous possibilities, we decided on a camera-based detection system. Cameras integrated with AI-powered people detection from AWS Rekognition count the number of individuals in a space and estimate the occupancy level by comparing the number of people with the number of seats available. This data is then processed and reflected on our website in real time.
