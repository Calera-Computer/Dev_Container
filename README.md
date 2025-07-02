# Dev_Container

A comprehensive Docker container orchestrator platform that provides advanced management capabilities for launching, monitoring, and controlling containerized instances of multiple app templates with data isolation and self-hosting capabilities.

## Structure

- `backend/` - Golang Fiber API with comprehensive container management endpoints
- `frontend/` - React + Vite frontend with advanced container control interface  
- `app_template/` - Basic Golang Fiber + React app template
- `note_template/` - Notes application with CRUD functionality
- `docker-compose.yml` - Orchestrates services for local development

## Available Templates

### 🚀 Basic Web App (`app_template`)
- Simple Go Fiber + React application 
- Health monitoring and status display
- Beautiful modern UI with gradient design
- API endpoints for health checks

### 📝 Notes App (`note_template`)
- Full CRUD notes application
- Create, read, update, delete notes
- Persistent data storage in volumes
- Modern blue gradient UI
- Timestamps for creation and updates

## Advanced Orchestrator Features

### 🐳 Container Management
- **Multi-state Operations**: Start, stop, restart containers individually or in bulk
- **Real-time Status Monitoring**: Live container state tracking with color-coded status indicators
- **Bulk Operations**: Select multiple containers for simultaneous actions
- **Container Lifecycle**: Full control over container creation, management, and deletion

### 🔍 Monitoring & Inspection
- **Live Container Logs**: View real-time logs with terminal-style interface
- **Detailed Container Inspection**: Complete container metadata and configuration
- **Resource Monitoring**: Track container state, restart count, and system information
- **Network Information**: View port mappings, network settings, and routing details

### 🎛️ User Interface Controls
- **Tabbed Interface**: Organized containers, launch, and templates sections
- **Advanced Filtering**: Filter by status (running, stopped, paused), template type, or search terms
- **Bulk Selection**: Multi-select containers with select-all functionality
- **Auto-refresh**: Automatic container list updates every 5 seconds
- **Responsive Design**: Modern grid layout adapting to different screen sizes

### 🔧 Advanced Search & Filtering
- **Text Search**: Search by container ID, template name, or tenant ID
- **Status Filtering**: Filter containers by running state
- **Template Filtering**: Show containers from specific templates
- **Real-time Updates**: Filters apply instantly as you type

## Usage

1. **Launch the orchestrator stack**:
   ```sh
   docker-compose up --build
   ```

2. **Access the web interface**: Visit [http://localhost](http://localhost)

3. **Container Management Workflow**:
   - Navigate to the **Containers** tab to view all running instances
   - Use **Launch** tab to create new containers from available templates  
   - Monitor container status and access logs/details directly from the interface
   - Perform bulk operations on multiple containers simultaneously
   - Use search and filters to manage large numbers of containers efficiently

### Container Operations

#### Individual Container Controls
- **🌐 Visit**: Direct access to container's web interface
- **▶️ Start/⏹️ Stop/🔄 Restart**: Control container lifecycle
- **📋 Logs**: View real-time container logs in terminal interface
- **🔍 Details**: Inspect complete container configuration and metadata
- **🗑️ Delete**: Remove container and associated resources

#### Bulk Operations
- **Select containers** using checkboxes or "Select All"
- **Choose bulk action**: Start All, Stop All, Restart All, or Delete All
- **Execute with confirmation** to prevent accidental operations

#### Filtering & Search
- **🔍 Text Search**: Find containers by ID, template, or tenant
- **📊 Status Filter**: Show only running, stopped, or paused containers
- **📋 Template Filter**: Display containers from specific templates
- **🔄 Real-time Refresh**: Auto-update every 5 seconds or manual refresh

## API Endpoints

### Container Lifecycle
- `POST /api/launch` - Launch new container from template
- `DELETE /api/launch/{container_id}` - Delete container
- `POST /api/containers/{container_id}/start` - Start stopped container
- `POST /api/containers/{container_id}/stop` - Stop running container  
- `POST /api/containers/{container_id}/restart` - Restart container

### Monitoring & Information  
- `GET /api/containers` - List all orchestrator-managed containers
- `GET /api/containers/{container_id}/logs` - Fetch container logs
- `GET /api/containers/{container_id}/inspect` - Get detailed container information
- `GET /api/templates` - List available application templates

### Example API Usage

```bash
# Launch a notes app container
curl -X POST http://localhost/api/launch \
  -H "Content-Type: application/json" \
  -d '{"template": "note_template"}'

# Stop a running container
curl -X POST http://localhost/api/containers/{container_id}/stop

# Get container logs
curl -X GET http://localhost/api/containers/{container_id}/logs

# Get detailed container information
curl -X GET http://localhost/api/containers/{container_id}/inspect

# Bulk operations (use multiple API calls for bulk actions)
for container in container1 container2 container3; do
  curl -X POST http://localhost/api/containers/$container/restart
done
```

## Web Interface Features

### 📱 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Emoji Icons**: Intuitive visual indicators for quick recognition
- **Color-coded Status**: Immediate visual feedback for container states
- **Confirmation Dialogs**: Prevent accidental destructive operations
- **Loading States**: Clear feedback during async operations

### 🎨 Visual Indicators
- **🟢 Green**: Running containers
- **🔴 Red**: Stopped/exited containers  
- **🟠 Orange**: Created/starting containers
- **🟣 Purple**: Paused containers
- **🔵 Blue**: Restarting containers

### ⚡ Performance Features
- **Lazy Loading**: Container details and logs load on demand
- **Efficient Updates**: Only refresh data when needed
- **Optimized Rendering**: Minimal re-renders for smooth performance
- **Parallel Operations**: Bulk actions execute simultaneously

## Container Management Features

- **🏷️ Template-based Deployment**: Choose from pre-configured application templates
- **🔒 Tenant Isolation**: Each container gets unique tenant ID and data volume
- **🌐 Automatic Routing**: Traefik handles subdomain routing for each container
- **📊 Status Monitoring**: Real-time container state tracking
- **🔧 Lifecycle Management**: Full start/stop/restart control
- **📋 Log Management**: Easy access to container logs with timestamps
- **🔍 Deep Inspection**: Complete container metadata and configuration access
- **⚡ Bulk Operations**: Efficient management of multiple containers
- **🔄 Auto-refresh**: Automatic status updates every 5 seconds

## Adding New Templates

To add a new template:

1. **Create template directory**: `mkdir my_template`
2. **Add Dockerfile**: Build process for your application
3. **Create backend**: Go application serving your API and frontend
4. **Create frontend**: React application for your UI
5. **Update orchestrator**: Add template definition in `backend/main.go`
6. **Build image**: `docker build -t my_template:latest ./my_template`

Template structure:
```
my_template/
├── Dockerfile
├── backend/
│   ├── go.mod
│   ├── go.sum
│   └── main.go
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        └── App.jsx
```

## Development

### Backend Development
The Go backend (`/backend/main.go`) provides a comprehensive REST API for container orchestration with full Docker integration.

### Frontend Development  
The React frontend (`/frontend/src/App.jsx`) offers a modern, responsive interface with advanced container management capabilities.

### Running in Development
```bash
# Start the full stack
docker-compose up --build

# Access services
- Frontend: http://localhost
- Traefik Dashboard: http://localhost:8080
- Backend API: Proxied via Traefik
```

## Security Considerations

⚠️ **Development Configuration**: 
- Traefik dashboard and API are enabled and insecure for development
- Docker socket is mounted into containers for orchestration
- **Do not use this configuration in production!**

For production deployment:
- Enable Traefik authentication and HTTPS
- Implement proper API authentication
- Use Docker-in-Docker or remote Docker API instead of socket mounting
- Add rate limiting and input validation
- Configure proper network isolation

## Architecture

- **Traefik**: Reverse proxy with automatic service discovery
- **Backend (Go)**: Container orchestration API with Docker integration
- **Frontend (React)**: Modern web interface for container management
- **Docker**: Container runtime and orchestration
- **Volumes**: Persistent data storage per tenant

## Performance & Scalability

- **Concurrent Operations**: Bulk actions execute in parallel
- **Efficient Polling**: Smart refresh intervals minimize API calls
- **Responsive UI**: Optimized for quick interactions and feedback
- **Resource Monitoring**: Track container resource usage and health
- **Scalable Architecture**: Designed to handle dozens of concurrent containers
