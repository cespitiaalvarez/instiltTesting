const express = require("express");
const path = require("path");
const { Client } = require("@notionhq/client");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public", "index.html"));
});

const notion = new Client({
  auth: process.env.API_KEY,
});

app.get("/getRecords", async (req, res) => {
  console.log("getting records...");
  const DATABASE_ID = process.env.DATABASE_ID;
  let allRecords = [];
  let nextPageToken = undefined;
  try {
    do {
      const response = await notion.databases.query({
        database_id: DATABASE_ID,
        start_cursor: nextPageToken,
        // filter by status Active, Unresponsive, Joined
        filter: {
          or: [
            {
              property: "Status",
              status: {
                equals: "Active",
              },
            },
            {
              property: "Status",
              status: {
                equals: "Unresponsive",
              },
            },
            // {
            //   property: "Status",
            //   status: {
            //     equals: "Joined"
            //   }
            // },
          ],
        },
      });

      allRecords.push(...response.results);

      nextPageToken = response.next_cursor;
    } while (nextPageToken);

    // remove empty records
    allRecords = allRecords.filter(
      (record) => record.properties.Name.title[0]?.plain_text !== undefined
    );
    const formattedRecords = allRecords.map((record) => ({
      id: record.properties.ID.unique_id.number,
      name: record.properties.Name.title[0]?.plain_text || "",
      email: record.properties.Email.email || "",
      position:
        record.properties.Position.multi_select.length > 0
          ? record.properties.Position.multi_select[0].name
          : record.properties.Team.multi_select[0]?.name
              .replace("Non-Departmental", "Tutor")
              .replace("HR", "Human Resources"),
      team: record.properties.Team.multi_select[0]?.name.replace(
        "Non-Departmental",
        "Tutor"
      ),
      location:
        record.properties.City.select != undefined
          ? record.properties.City.select.name +
            ", " +
            record.properties.Country.select?.name
          : record.properties.Country.select?.name || "",
      image: record.properties.image.url || "",
      image: record.properties.image.url
        ? record.properties.image.url
            .split("/view")[0]
            .replace("/file/d/", "/uc?export=view&id=")
        : "",
    }));
    formattedRecords.sort((a, b) => (a.name > b.name ? 1 : -1));
    res.status(200).json(formattedRecords);
  } catch (error) {
    console.error("Error fetching database records:", error);
    res.status(500).json({ error: "Internal server error" }); // Set HTTP status code to 500 (Internal Server Error) for any unexpected errors
  }
});

app.post("/submitTimes", async (req, res) => {
  // get json data from req
  // send to notion
  // send back response
  const timeData = req.body;
  console.log(timeData);
  var databaseId = "f3b4e539d8a0482eb512457311b0bd75";
  const SundaySlots = {
    multi_select: timeData.sunday.map((slot) => ({ name: slot })),
  };
  const MondaySlots = {
    multi_select: timeData.monday.map((slot) => ({ name: slot })),
  };
  const TuesdaySlots = {
    multi_select: timeData.tuesday.map((slot) => ({ name: slot })),
  };
  const WednesdaySlots = {
    multi_select: timeData.wednesday.map((slot) => ({ name: slot })),
  };
  const ThursdaySlots = {
    multi_select: timeData.thursday.map((slot) => ({ name: slot })),
  };
  const FridaySlots = {
    multi_select: timeData.friday.map((slot) => ({ name: slot })),
  };
  const SaturdaySlots = {
    multi_select: timeData.saturday.map((slot) => ({ name: slot })),
  };

  const filterEmail = timeData.email;

  // Check if a page with the same email already exists
  const filterResponse = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Email",
      rich_text: {
        equals: filterEmail,
      },
    },
  });

  if (filterResponse.results.length > 0) {
    // If a page with the same email exists, update it
    const existingPageId = filterResponse.results[0].id;

    const updateResponse = await notion.pages.update({
      page_id: existingPageId,
      properties: {
        // Update the properties you want to change
        Monday: MondaySlots,
        Tuesday: TuesdaySlots,
        Wednesday: WednesdaySlots,
        Thursday: ThursdaySlots,
        Friday: FridaySlots,
        Saturday: SaturdaySlots,
        Sunday: SundaySlots,
      },
    });

    res.send(updateResponse);
  } else {
    // create a new page
    const response = await notion.pages.create({
      parent: {
        database_id: databaseId,
      },
      properties: {
        Name: {
          title: [
            {
              text: {
                content: timeData.name,
              },
            },
          ],
        },
        Email: {
          rich_text: [
            {
              text: {
                content: timeData.email,
              },
            },
          ],
        },
        Monday: MondaySlots,
        Tuesday: TuesdaySlots,
        Wednesday: WednesdaySlots,
        Thursday: ThursdaySlots,
        Friday: FridaySlots,
        Saturday: SaturdaySlots,
        Sunday: SundaySlots,
      },
    });
    res.send(response);
  }
});

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

module.exports = app;
