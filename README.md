# Protocol conformance verification tool
This tool was developed as part of the Bachelor's project of Rares Dobre. Supervisors: Bas van den Heuvel, Jorge A. Pérez.


## Requirements
- Node - download [link](https://nodejs.org/en/download/)
- npm - installation guide [link](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## How to run the project
To run a router process for a given participant, the modules have to be installed first, and then the router can be started. Execute

```
npm install
``` 

in a terminal window. After all the node modules have been installed, the router processes can be started. Each router process needs the specification of the protocol in JSON format. Inside the JSON file corresponding to the given protocol, the implementing party must be specified, the port on which the router will listen, the other participants, and the global type. For an example, please see the protocol specification from `./CSA Suite/authorization/CSA_authorization.JSON`. Please note that there is no need to have separate files for each implementing party, as the same file can be edited after starting a router process such that it fits a different implementing party. Yet, in the current CSA suite, different specification files were used for conveniency. After defining the protocol specification, the routers can be started. To start a router process, execute:

```
PROTOCOL_PATH=<PATH> node router.js
```

Where `<PATH>` is replaced by the path to the protocol specification file. The actual parties must be started before the routers, because the implementing parties must wait for the "green light" from the routers. That is, once the routers check that the network of routers is up and running, and that every router is connected to its implementing party, the communication can begin. Thus, first start up all the implementing parties, then start all the routers. Once all the routers are connected, the transmission will commence.

--- 
To exeute the CSA test suite, the following commands must be executed. We recommend 6 different terminal windows to thoroughly observe the progress of the routers and the message exchanges. 2 terminal windows are needed for each participant, one for the implementation, and one for the router. First, start up all the implementing parties.

The Client service can be started using: 
```
node CSA\ suite/client/client.js
```

Afterwards, the Authorization service can be started:
```
node CSA\ suite/authorization/authorization.js
```

Lastly, the Server can be started using:
```
node CSA\ suite/server/server.js
```

Next, start up all the routers.

For the Client Router, execute it one terminal:
```
PROTOCOL_PATH="./CSA Suite/client/CSA_client.json" node router.js
```
For the Server Router, execute in a different terminal:
```
PROTOCOL_PATH="./CSA Suite/server/CSA_server.json" node router.js
```
For the Authorization Router, execute in a different terminal:
```
PROTOCOL_PATH="./CSA Suite/authorization/CSA_authorization.json" node router.js
```

The start up order of the implementing parties is irrelevant. Same holds for the routers. However, all implementing parties must be started before the actual routers. Failure to start an implementing party before its router will yield an error, and the router process will terminate. 
