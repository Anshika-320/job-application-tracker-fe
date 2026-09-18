export function createApi(client) {
  return {
    login(credentials) {
      return client.request('/auth/login', {
        method: 'POST',
        body: credentials,
        authenticated: false,
      })
    },

    listApplications(options) {
      return client.request('/applications', options)
    },

    listApplicationsByStatus(status, options) {
      return client.request(
        `/applications/status?status=${encodeURIComponent(status)}`,
        options,
      )
    },

    listApplicationsByLocation(location, options) {
      return client.request(
        `/applications/location?location=${encodeURIComponent(location)}`,
        options,
      )
    },

    searchApplicationsByCompanyName(companyName, options) {
      return client.request(
        `/applications/search?companyName=${encodeURIComponent(companyName)}`,
        options,
      )
    },

    listNoteCounts(options) {
      return client.request('/applications/note-counts', options)
    },

    createApplication(application) {
      return client.request('/applications', { method: 'POST', body: application })
    },

    updateApplication(id, application) {
      return client.request(`/applications/${id}`, { method: 'PUT', body: application })
    },

    deleteApplication(id) {
      return client.request(`/applications/${id}`, { method: 'DELETE' })
    },

    listNotes(applicationId, options) {
      return client.request(`/applications/${applicationId}/notes`, options)
    },

    createNote(applicationId, note) {
      return client.request(`/applications/${applicationId}/notes`, {
        method: 'POST',
        body: note,
      })
    },

    deleteNote(applicationId, noteId) {
      return client.request(`/applications/${applicationId}/notes/${noteId}`, {
        method: 'DELETE',
      })
    },
  }
}
