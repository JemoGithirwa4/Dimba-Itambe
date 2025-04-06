# Dimba Itambe Football League Web Application

A comprehensive football league platform with ticketing, team information and other football league related content.

## Features

**Ticket Purchasing System**
  - M-Pesa payment integration
  - QR code generation for tickets
  - Email notifications with ticket details
  - Payment callback handling

**Team & Player Management**
  - Player statistics display
  - Team rosters and information
  - League standings

**Match Information**
  - Fixtures schedule
  - Match results tracking
  - Goal scorers 

**Content Display**
  - News articles 
  - Video highlights
  - Job postings/careers section

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Html, CSS, Bootstrap, EJS templates
- **Database**: PostgreSQL
- **Payment Processing**: Safaricom M-Pesa Daraja API
- **Email**: Nodemailer
- **QR Codes**: qrcode library
- **Other**: Axios, body-parser, dotenv, uuid

## Demo
For a video demonstration click [here](https://youtu.be/kE7fklxjxaU)
### 1. Home Page
The home page features the latest football updates. It has three parts:
#### 1.1 Latest articles section
![Home Page](public/images/demo/home.PNG)

To read an article click "read more" button. Below is a sample article view:
![Article View](public/images/demo/article.PNG)

#### 1.2 Gameweek fixtures section
![Gameweek Fixtures](public/images/demo/gw.PNG)

To purchase a ticket click "Tickets".
![Fixtures Ticket](public/images/demo/ticket.PNG)

The user enters their phone number that will make the payment and the email address which the ticket will be sent to. Click “Pay with M-Pesa”. 
An STK push will be received on the phone number entered, enter M-pesa pin to complete the ticket purchase.
![STK success](public/images/demo/stk.PNG)

Below is how the ticket looks like once payment is completed and sent to the entered email:
![Ticket](public/images/demo/tiko.PNG)

#### 1.3 Featured player section
This contains a profile of 3 chosen players with their various statistics. It keeps changing from time to time.
![Featured players section](public/images/demo/feat-players.PNG)

### 2. Watch Page
This is the page with the video highlights for played games.
![Watch Page](public/images/demo/watch.PNG)
To watch the highlights just click the red play button.

### 3. Teams Page
The teams page displays teams registered in the league.
![Teams Page](public/images/demo/teams.PNG)
To view a specific club’s website click “View club ->”.
To search for a club click on the input box named “Search Clubs” and enter the club name. Display is toggled as the text is entered.

### 4. Players Page
The players page displays players registered in the league and their stats.
It is divided into two parts:
#### 4.1 Player View
To display the players. A players name, image, club logo, nationality, position and kit number are displayed.
![Players Page](public/images/demo/players.PNG)
A player can also be searched through the input box at the top.

#### 4.2 Stats View
To display the players statistics. A specific player can also be searched for through the input box at the top.
![Players Page stats](public/images/demo/stats.PNG)

### 5. Fixtures Page
This page contains details of all scheduled league fixtures alongside the results and the league table.
It is divided into three parts:
#### 5.1 Fixtures View
Displays all the league's scheduled fixtures.
![Fixtures Page](public/images/demo/fix.PNG)
A fixture can also be searched through the input box at the top.

#### 5.2 Results View
To display the fixture results. A specific fixture can also be searched for through the input box at the top.
![Fixtures Page results 1](public/images/demo/res1.PNG)
![Fixtures Page results 2](public/images/demo/res2.PNG)

#### 5.3 League Table View
To display the full league standings.
![League standings](public/images/demo/table.PNG)

### 6. Careers Page
This page contains details of all job openings in the league.
![Careers Page](public/images/demo/career.PNG)

To read the job details click "More Details".
![Job example Page](public/images/demo/job1.PNG)
![Job example Page](public/images/demo/job1-2.PNG)

Follow the instructions given. Additionally clicking "Apply Now" redirects users to their email app and they can complete the process there and send.

### 7. More
Additionally, their is an admin side application for managing the league information. To access this, on the navbar at the top click "More", a drop-down appears. Click "Admin" to be redirected to the administration system.

For the admin side demonstration click [here](https://github.com/JemoGithirwa4/Dimba-Itambe-Admin)

Additionally, the website is responsive for different screen sizes.