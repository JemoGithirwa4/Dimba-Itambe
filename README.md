# Dimba Itambe Football League Web Application

A comprehensive football league platform with ticketing, team information and other football league related content.

## Features

- **Ticket Purchasing System**
  - M-Pesa payment integration
  - QR code generation for tickets
  - Email notifications with ticket details
  - Payment callback handling

- **Team & Player Management**
  - Player statistics display
  - Team rosters and information
  - League standings

- **Match Information**
  - Fixtures schedule
  - Match results tracking
  - Goal scorers 

- **Content Display**
  - News articles 
  - Video highlights
  - Job postings/careers section

## Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS templates
- **Database**: PostgreSQL
- **Payment Processing**: Safaricom M-Pesa Daraja API
- **Email**: Nodemailer
- **QR Codes**: qrcode library
- **Other**: Axios, body-parser, dotenv, uuid

## Demo
For a video demonstration click ![here](https://youtu.be/kE7fklxjxaU)
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

