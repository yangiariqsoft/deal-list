function Application() {
    this.dataLoadedKeys = [];
    this.userIds = new Set();
    this.stageIds = new Set();
    this.deals = [];
    this.dealAssignedUsers = new Map();
    this.dealStages = new Map();
    this.errorMessage = '';
}

Application.prototype.addLoadedKey = function(key) {
    this.dataLoadedKeys[key] = {
        loaded: false
    };
}

Application.prototype.isDataLoaded = function() {
    for (keyIndex in this.dataLoadedKeys)
        if (this.dataLoadedKeys[keyIndex].loaded !== true) return;

    this.processUserInterface();
}

Application.prototype.displayErrorMessage = function(message, selector) {
    $(selector).html(message);
}

Application.prototype.processUserInterface = function(){
    var curapp = this;
    $('#deal-list').html('');
    var dealListHtml = '';
    for(var data of this.deals){
        var dateCreate = new Date(data.DATE_CREATE);
        var user = this.dealAssignedUsers.get(data.ASSIGNED_BY_ID);
        var stage = this.dealStages.get(data.STAGE_ID);
        dealListHtml += '<tr><td class="deal-title" data-id="'+ data.ID + '"><div class="text">' + data.TITLE
            + '</div><input type="button" class="editButton" value="Редактировать" style="display: none"/>'
            + '<div class="edit" style="display: none"><input type="text" value="' + data.TITLE
            + '"><button class="saveButton">Сохранить</button></div></td><td>'
            + data.OPPORTUNITY + '</td><td>' + dateCreate.toLocaleString("ru") + '</td><td>'
            + stage.NAME + '</td><td class="user-info" data-toggle="modal" data-target="#userInfoModal" data-id="'
            + user.ID + '">' + user.LAST_NAME + ' ' + user.NAME + '</td></tr>';
    }
    $('#deal-list').html(dealListHtml);

    $('.deal-title').on('mouseenter', function () {
        $(this).find('.editButton').css('display', 'block');
    });

    $('.deal-title').on('mouseleave', function () {
        $(this).find('.editButton').css('display', 'none');
        $(this).find('.edit').css('display', 'none');
    });

    $('.editButton').on('click', function () {
        $(this).parent().find('.edit').css('display', 'block');
        $(this).css('display', 'none');
    });

    $('.saveButton').on('click', function () {
        $(this).parent().css('display', 'none');
        curapp.updateDealTitle($(this).parent().parent());
    });

    $('.user-info').on('click', function () {
        var user = curapp.dealAssignedUsers.get(String($(this).data('id')));
        if (user.PERSONAL_PHOTO != null){
            $('#userInfoPhoto').attr('src', user.PERSONAL_PHOTO);
        }else{
            $('#userInfoPhoto').attr('src', 'noimage.png');
        }
        $('#userInfoName').html(user.LAST_NAME + ' ' + user.NAME);
        $('#userInfoEmail').html(user.EMAIL);
    });
}

Application.prototype.getDealAssignedUsers = function(userIds){
    var curapp = this;
    BX24.callMethod(
        "user.get",
        {
            order: { "ID": "ASC" },
            filter: { "ID": userIds },
            select: [ "ID", "NAME", "LAST_NAME"]
        },
        function (result) {
            if(result.error()){
                curapp.errorMessage += result.error();
                console.error(result.error());
            }else{
                let arData = result.data();

                for(let data of arData){
                    curapp.dealAssignedUsers.set(data['ID'], data);
                }

                if(result.more()){
                    result.next();
                }else {
                    curapp.dataLoadedKeys['get-assigned-users'].loaded = true;
                    curapp.isDataLoaded();
                }
            }
        }
    );
}

Application.prototype.getDealStages = function(stageIds){
    var curapp = this;
    BX24.callMethod(
        "crm.status.list",
        {
            order: { "SORT": "ASC" },
            filter: { "ENTITY_ID": "DEAL_STAGE", "ID": stageIds }
        },
        function (result) {
            if(result.error()){
                curapp.errorMessage += result.error();
                console.error(result.error());
            }else{
                let arData = result.data();

                for(let data of arData){
                    curapp.dealStages.set(data['STATUS_ID'], data);
                }

                if(result.more()){
                    result.next();
                }else {
                    curapp.dataLoadedKeys['get-stages'].loaded = true;
                    curapp.isDataLoaded();
                }
            }
        }
    );
}

Application.prototype.getDeals = function(){
    var curapp = this;
    BX24.callMethod(
        "crm.deal.list",
        {
            order: { "STAGE_ID": "ASC" },
            filter: {},
            select: [ "ID", "TITLE", "OPPORTUNITY", "ASSIGNED_BY_ID", "DATE_CREATE", "STAGE_ID"]
        },
        function (result) {
            if(result.error()){
                curapp.errorMessage += result.error();
                console.error(result.error());
            }else{
                let arData = result.data();

                for(let data of arData){
                    curapp.deals.push(data);
                    curapp.userIds.add(data['ASSIGNED_BY_ID']);
                    curapp.stageIds.add(data['STAGE_ID']);
                }

                if(result.more()){
                    result.next();
                }else {
                    curapp.getDealAssignedUsers(curapp.userIds);
                    curapp.getDealStages(curapp.stageIds);
                    curapp.dataLoadedKeys['get-deals'].loaded = true;
                    curapp.isDataLoaded();
                }
            }
        }
    );
}

Application.prototype.displayDeals = function(){
    this.addLoadedKey('get-assigned-users');
    this.addLoadedKey('get-stages');
    this.addLoadedKey('get-deals');
    this.getDeals();

}

Application.prototype.updateDealTitle = function(elementTitle){
    var id = elementTitle.data('id');
    var newValue = elementTitle.find('.edit input').val();
    BX24.callMethod(
        "crm.deal.update",
        {
            id: id,
            fields:
                {
                    "TITLE": newValue
                },
            params: {}
        },
        function(result)
        {
            if(result.error())
                console.error(result.error());
            else
            {
                elementTitle.find('.text').html(newValue);
            }
        }
    );
}

app = new Application();