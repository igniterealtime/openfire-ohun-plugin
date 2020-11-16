<%@ page import="org.jivesoftware.util.*,
                 org.jivesoftware.openfire.XMPPServer,
                 org.jivesoftware.openfire.muc.*,
                 org.jivesoftware.util.JiveGlobals,
                 org.apache.http.*,
                 org.apache.http.HttpResponse,
                 org.apache.http.client.HttpClient,
                 org.apache.http.entity.ByteArrayEntity,
                 org.apache.http.client.methods.HttpPost,
                 org.apache.http.impl.client.DefaultHttpClient,                
                 java.io.*,
                 java.util.*,                 
                 net.sf.json.*,
                 java.net.URLEncoder"                 
    errorPage="error.jsp"
%>
<%@ page import="org.xmpp.packet.JID" %>

<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c"%>
<%@ taglib uri="http://java.sun.com/jsp/jstl/fmt" prefix="fmt" %>
<jsp:useBean id="webManager" class="org.jivesoftware.util.WebManager"  />
<% webManager.init(request, response, session, application, out ); %>

<%         
        List<MUCRoom> rooms = XMPPServer.getInstance().getMultiUserChatManager().getMultiUserChatService("conference").getChatRooms();        
        int confCount = rooms.size();        
%>
<html>
    <head>
        <title><fmt:message key="plugin.title.description"/></title>
        <meta name="pageID" content="ohun-summary"/>
    </head>
    <body>

<%  if (request.getParameter("deletesuccess") != null) { %>

    <div class="jive-success">
    <table cellpadding="0" cellspacing="0" border="0">
    <tbody>
        <tr><td class="jive-icon"><img src="images/success-16x16.gif" width="16" height="16" border="0" alt=""></td>
        <td class="jive-icon-label">
        <fmt:message key="ohun.conference.expired" />
        </td></tr>
    </tbody>
    </table>
    </div><br>

<%  }

    HttpClient client = new DefaultHttpClient();
    HttpPost post = new HttpPost("http://" + JiveGlobals.getProperty("ohun.ipaddr", "127.0.0.1") + ":" + JiveGlobals.getProperty("ohun.port", "7000"));
    post.setHeader("Content-Type", "application/json");

    String body = "{\"id\": \"ohun_summary\", \"method\": \"info\", \"params\": []}";
    HttpEntity entity = new ByteArrayEntity(body.getBytes("UTF-8"));
    post.setEntity(entity);

    HttpResponse response2 = client.execute(post);
    BufferedReader rd = new BufferedReader(new InputStreamReader(response2.getEntity().getContent()));

    String line;
    String json = "";
    while ((line = rd.readLine()) != null) {
        json = json + line;
    }
    JSONObject summary = new JSONObject(json).getJSONObject("data");

    String updated = summary.getString("updated_at");
    int active_peers = summary.getInt("active_peers");      
    int closed_peers = summary.getInt("closed_peers");
    int active_rooms = summary.getInt("active_rooms");          
    int closed_rooms = summary.getInt("closed_rooms"); 
    String service_url = "https://" + XMPPServer.getInstance().getServerInfo().getHostname() + ":" + JiveGlobals.getProperty("httpbind.port.secure", "7443") + "/ohun/my_room_name";

%>
    <p>
        <fmt:message key="config.page.connectivity.description" />&nbsp;<a target="_blank" href="<%= service_url %>"><%= service_url %></a>
    </p>    

    <div class="jive-table">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
    <thead>
        <tr>
            <th nowrap><fmt:message key="ohun.summary.updated" /></th>   
            <th nowrap><fmt:message key="ohun.summary.active.peers" /></th>
            <th nowrap><fmt:message key="ohun.summary.closed.peers" /></th>
            <th nowrap><fmt:message key="ohun.summary.active.rooms" /></th>           
            <th nowrap><fmt:message key="ohun.summary.closed.rooms" /></th>       
        </tr>
    </thead>
    <tbody>
        <tr>
            <td nowrap><%= updated %></th>   
            <td nowrap><%= active_peers %></th>
            <td nowrap><%= closed_peers %></th>
            <td nowrap><%= active_rooms %></th>           
            <td nowrap><%= closed_rooms %></th>       
        </tr>
    </tbody>
    </table>
    </div>
    <br/>
    
    <p>&nbsp;</p>

    <div class="jive-table">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
    <thead>
        <tr>
            <th>&nbsp;</th>
            <th nowrap><fmt:message key="ohun.summary.conference" /></th>
            <th nowrap><fmt:message key="ohun.summary.last.activity" /></th>
            <th nowrap><fmt:message key="ohun.summary.participants" /></th>           
            <th nowrap><fmt:message key="ohun.summary.dominant.speaker" /></th>           
        </tr>
    </thead>
    <tbody>  
<% 
    if (confCount == 0) {
%>
    <tr>
        <td align="center" colspan="10">
            <fmt:message key="ohun.summary.no.conferences" />
        </td>
    </tr>

<%
    }
    int i = 0;
    
    for (MUCRoom chatRoom : rooms)     
    {        
        body = "{\"id\": \"ohun_detail_" + i + "\", \"method\": \"list\", \"params\": [\"" + chatRoom.getName() + "\"]}";
        entity = new ByteArrayEntity(body.getBytes("UTF-8"));
        post.setEntity(entity);

        response2 = client.execute(post);
        rd = new BufferedReader(new InputStreamReader(response2.getEntity().getContent()));
        json = "";
        
        while ((line = rd.readLine()) != null) {
            json = json + line;
        }
        JSONArray peers = new JSONObject(json).getJSONObject("data").getJSONArray("peers");        
        
        if (peers.length() > 0)
        {
            i++;        
%>
            <tr class="jive-<%= (((i%2)==0) ? "even" : "odd") %>">
                <td width="1%">
                    <%= i %>
                </td>
                <td width="10%" valign="middle">
                <%= "<a href=\"/muc-room-occupants.jsp?roomJID=" + chatRoom.getName() + "@conference." + XMPPServer.getInstance().getServerInfo().getXMPPDomain() + "\">" + chatRoom.getName() + "</a>" %>
                </td>
                <td width="15%" align="center">
                    <%
                        long lastActivity = 0;
                        String elapsed = lastActivity == 0 ? "&nbsp;" : StringUtils.getElapsedTime(System.currentTimeMillis() - lastActivity);
                    %>
                <%= elapsed %>
                </td>  
                <td width="10%">
                <%= peers.length() %>
                </td>         
                <td width="10%" align="center">
                    <%= "&nbsp;" %>
                </td>        
            </tr>
<%
        }
    }
%>
</tbody>
</table>
</div>
</body>
</html>