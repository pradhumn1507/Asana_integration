import express from 'express'
import crypto from 'crypto'
import axios from 'axios';


//creates a new instance of an Express application
const app = express();


// <------------ middlewares ------------> 

//we'll be sending data in json format, that's why it is required to use this middleware
app.use(express.json());

// variables
const PORT = 4000

// Global variable to store the x-hook-secret
let secret = "";

// Local endpoint for receiving events
app.post("/receiveWebhook", (req, res) => {

    try {
        if (req.headers["x-hook-secret"]) {
            console.log("This is a new webhook")
            secret = req.headers["x-hook-secret"]
            res.setHeader("X-Hook-Secret", secret)
            res.sendStatus(200)
        } else if (req.headers["x-hook-signature"]) {

            const computedSignature = crypto
                .createHmac("SHA256", secret)
                .update(JSON.stringify(req.body))
                .digest("hex");

            if (
                !crypto.timingSafeEqual(
                    Buffer.from(req.headers["x-hook-signature"]),
                    Buffer.from(computedSignature)
                )
            ) {
                // Fail
                res.sendStatus(401);
            } else {
                // Success

                console.log(`Events on ${Date()}:`);
                // we have project ---> then section that's why receiving two events.. we can use either of them, both have same response gid
                const event = req.body.events[1];
                // if exist
                if (event) {
                    if (event.action === "added" && event.parent.resource_type === "section" && event.resource.resource_type === "task") {
                        // Access the task gid
                        const gid = event.resource.gid;
                        console.log(gid)
                        // if gid is not undefined
                        if (gid) {
                            // Make API request to fetch task details
                            const accessToken = "1/1205209979297500:13c2e738f87081e82f7552542ed4cb6c";
                            let taskResponse;
                            // giving a delay of 2 minutes, reason--> user also need some time to enter the task related information in Asana
                            setTimeout(async () => {
                                taskResponse = await axios.get(`https://app.asana.com/api/1.0/tasks/${gid}`, {
                                    headers: {
                                        "Authorization": `Bearer ${accessToken}`,
                                    },
                                });
                                // if task related information exist
                                if (taskResponse) {
                                    // destructuring the required details
                                    const taskDetails = taskResponse?.data?.data;

                                    const id = taskDetails?.gid
                                    const name = taskDetails?.name?.trim() || "Empty"
                                    const assignee = taskDetails?.assignee?.name?.trim() || "Yet To Be Assigned"
                                    const priority = taskDetails?.custom_fields[0]?.display_value?.trim() || "Not Selected"
                                    const duedate = taskDetails?.due_on || "Not Mentioned"
                                    const status = taskDetails?.custom_fields[1]?.display_value?.trim() || "Not Selected"
                                    const description = taskDetails?.custom_fields[2]?.text_value?.trim() || "Empty"

                                    console.log(id, name, assignee, priority, duedate, status, description)
                                    // data which we need to send to Air table
                                    const data = {
                                        "records": [
                                            {
                                                "fields": {
                                                    "ID": id,
                                                    "Name": name,
                                                    "Assignee": assignee,
                                                    "Priority": priority,
                                                    "Due Date": duedate,
                                                    "Status": status,
                                                    "Description": description,
                                                }
                                            },
                                        ]
                                    };

                                    console.log(data)
                                    // required variables to make a POST request
                                    const baseURL = 'https://api.airtable.com/v0';
                                    const baseId = "appYdjpVmzfNoast6";
                                    const tableIdOrName = "tbl1t9y0fg9dBbDrw";
                                    const apiKey = "patImrW7Qaw0sHVFp.e1d972bbcbf3b6d27afef8df19d3c8675e2bddce4dc62493fa632d2c25e5a415";
                                    // describing headers
                                    const headers = {
                                        'Authorization': `Bearer ${apiKey}`,
                                        'Content-Type': 'application/json',
                                    };
                                    // POST request to add a new row to Air Table
                                    axios.post(`${baseURL}/${baseId}/${tableIdOrName}`, data, { headers })
                                        .then(response => {
                                            console.log('POST request successful!');
                                            console.log(response.data);
                                        })
                                        .catch(error => {
                                            console.error('Error making POST request:', error);
                                        });
                                }

                            }, 60000 * 2)
                        }
                    }
                }

                res.sendStatus(200);
            }
        } else {
            console.error("Something went wrong!");
            res.sendStatus(400);
        }
    } catch (error) {
        console.error("Error: ", error)
        res.sendStatus(500);
    }
})


//it is a test route just to see our server is working
app.get("/", (req, res) => {
    return res.send(`<div style = "background:magenta;padding:100px;"><h2>Welcome to My Server</h2>
    <p>Description...</p>
        <div><ul>
            <li>Add a new task to Asana</li>
            <li>Collect this data through webhook</li>
            <li>Add this data to Airtable</li>
        </ul></div>
    </div>`)
})

//function is used to bind and listen to the connections on the specified host and port
app.listen(PORT, (req, res) => {
    console.log(`Server is active on Port ${PORT}`)
})