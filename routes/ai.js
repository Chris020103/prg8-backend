import { ChatOpenAI } from "@langchain/openai";
import express from "express";
const routes = express.Router();

import axios from 'axios'; // Ensure axios is installed

async function fetchVehicleDataByLicensePlate(licensePlate) {
    try {
        //Make a functtion to delete the - if there are - in the string
        const convertedLicensePlate = licensePlate.replace(/-/g, '').toUpperCase();

        const response = await axios.get(`https://opendata.rdw.nl/resource/m9d7-ebf2.json?kenteken=${convertedLicensePlate}`);
        if (response.data && response.data.length > 0) {
            return response.data[0]; // Return the vehicle data
        } else {
            console.log('No data found for the specified license plate.');
            return null; // Return null if no data found
        }
    } catch (error) {
        console.error('Error fetching vehicle data:', error);
        return null; // Return null on error
    }
}


routes.post('/chat', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');

    try {
        if (req.body.query) {
            let vehicleData = null;
            // Assuming req.body.history is your chat history array
            const chatHistory = req.body.history || []; // Fallback to an empty array if no history is provided

            if (chatHistory.length === 0) {
                vehicleData = await fetchVehicleDataByLicensePlate(req.body.query);
            }
            // Format the chat history into a string
            const formattedHistory = chatHistory.map(entry => {
                return `${entry.user === 'user' ? 'User' : 'Bot'}: ${entry.value}`;
            }).join("\n");
            let prompt = '';
            if(chatHistory.length === 0 ){
               await fetchVehicleDataByLicensePlate(req.body.query).then(data => {
                   vehicleData = data;
                   prompt = 'You are an experienced car mechanic with decades of experience under your belt. You are known for your meticulous attention to detail, diagnostic skills, and ability to explain complex car issues in simple terms to customers.\n' +
                      'You have been asked to diagnose a car problem based on the license plate number provided. The license plate number is: ' + req.body.query + '\n' +
                       'Here is some information about the car based on licensePlate' + `brand: ${data.merk} + model: ${data.handelsbenaming} + build year: ${data.datum_eerste_toelating} + color: ${data.eerste_kleur}` + 'Please ensure that you ask follow-up questions to gather all relevant details to diagnose the problem accurately and provide the best advice or solutions to the customer.\n' + 'If you dont have all the information ask for more information about the car' + 'If finally nothing helps you asks the location of the user to search on the internet the nearest car dealership from the brand that is mentioned in the conversation' + 'Check after every chat you have al the information needed from above' + 'Keep the answers a short as possible, but not rude .' + 'Try to get youtube videos of the solution and return a object with the message and the youtube video seperate show the url of the youtube video in the response not [URL of video] just show the https://youtube url (Only if you have the solution) and place this on the section youtube in the object' + 'Can you return a object with the message and a section named youtube' +
                       'Now you have the information about the car ask for the problem with the car'

               }).then(response => response).catch(error => {});

            }else{
                console.log(vehicleData);
                 prompt = 'You are an experienced car mechanic with decades of experience under your belt. You are known for your meticulous attention to detail, diagnostic skills, and ability to explain complex car issues in simple terms to customers.\n' +
                    `Here is the included vehicle data: ${vehicleData} if it isn't enough ask for more information` +  'You dont have any car information so your first object is to get all the car information needed, the following information is needed:' +
                    '- Car brand and Model\n' +
                    '- Build Year\n' +
                    '- Symptoms/Issue Described by Customer\n' +
                    'Please ensure that you ask follow-up questions to gather all relevant details to diagnose the problem accurately and provide the best advice or solutions to the customer.\n' + 'If you dont have all the information ask for more information about the car' + 'If finally nothing helps you asks the location of the user to search on the internet the nearest car dealership from the brand that is mentioned in the conversation' + 'Check after every chat you have al the information needed from above' + 'Keep the answers a short as possible, but not rude .' + 'Try to get youtube videos of the solution and return a object with the message and the youtube video seperate show the url of the youtube video in the response not [URL of video] just show the https://youtube url (Only if you have the solution) and place this on the section youtube in the object'
                    + 'If you cant solve this problem search for the nearest dealership of that brand. But only based on real information from a website not fake dealerships'
            }


            // Append the new query to the formatted history
            const fullQuery = `${formattedHistory}${prompt}\n${req.body.query}\n`;
            const model = new ChatOpenAI({
                azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
                azureOpenAIApiVersion: process.env.OPENAI_API_VERSION,
                azureOpenAIApiInstanceName: process.env.INSTANCE_NAME,
                azureOpenAIApiDeploymentName: process.env.ENGINE_NAME,
                response_format: { type: "json_object" },
                verbose: true,

            });
            if(req.body.query === 'reset'){
                const controller = new AbortController();
                setTimeout(() => {
                    controller.abort();
                }, 2000);
            }


            // Now, use fullQuery as the input to your model
            const data = await model.invoke(fullQuery);

            if (data.content) {
                res.json(data.content);
            } else {
                res.send("No response found");
            }
        } else {
            res.json('Please provide a query');
        }
    } catch (error) {
        console.error("Error in processing:", error);
        res.status(500).send("An error occurred.");
    }
});

export default routes;
