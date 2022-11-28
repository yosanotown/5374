

var search_func_state = 0; // 0:未ロード, 1:検索DB構築完 (検索可能), 2:検索実行中
var prev_search_query = "";
var gomi_color_obj = {};

var search_and_show = function(fuse){
  const user_input_string = $("#search-box").val();


  // 検索ボックスが空ならば、ごみ収集日リストを表示する
  if(user_input_string == ""){
    if($("#accordion").is(":visible")){
      return;
    }else{
      $("#search_query_prefix").text("");
      $("#search_query_postfix").text("");
      $.when(
        $("#search-results").fadeOut(200)
      ).done(function(){ 
        $("#accordion").fadeIn(200);
      }); 
      return;
    }
  }
  
  // DB読み込み未完了ならば、750ms後に再実行
  if( search_func_state == 0 ){
    setTimeout(function(){ search_and_show(fuse); }, 750);
    return;
  }

  // 前回検索クエリとの差分から検索実行の要否を判定
  if( user_input_string == prev_search_query && $("#search-results").is(":visible") ){
    return;
  }
  prev_search_query = user_input_string;
  search_func_state = 2;


  if( $("#accordion").is(":visible") ){
    $("#accordion").fadeOut(300);
  }
  if( !$("#search-results").is(":visible") ){
    $("#search-results").show();
  }
  if( $("#result-container").is(":visible") ){
    $("#result-container").hide();
  }
    
  

    const result = fuse.search(user_input_string);
    // 検索完了
    search_func_state = 1;
    $("#result-container").html("");
    $("#search_query_prefix").text("「" + user_input_string + "」の");
    $("#search_query_postfix").text("：" + result.length + "件");

    var item_counter = 0;
    for(const resultitem of result){
      var gominame = resultitem.item["gominame"];
      var gominame_kana = resultitem.item["gominame_kana"];
      var gomicategory = resultitem.item["gomicategory"];
      var gomiremark = resultitem.item["gomiremark"];
      var score = resultitem["score"];
      
      // var result_item_html = "<div class=\"item-gomi label-gomi\"> " + gominame + "</div><div class=\"item-arrow\"> <img src=\"img/arrow-right.svg\"> </div> <div class=\"item-category label-gomi\">分別方法：" + gomicategory + "</div>";
      var result_item_html = "<div class=\"item-gomi\"> " + gominame + "</div> <ul> <li class=\"list-category\"> 分別方法：" + gomicategory + "</li>";
      
      var remark_item_html = "";
      if(gomiremark != ""){
        // remark_item_html = "<div class=\"result-remarks\">" + gomiremark + "</div>";
        remark_item_html = "<li class=\"list-remark\"> 備考：" + gomiremark + "</li></ul>";
      }else{
        var remark_item_html = "</ul>";
      }
      var item_id_str = "item_" + item_counter;
      $("#result-container").append("<div class=\"result-item\" id=\""+ item_id_str +"\">" + result_item_html + remark_item_html + "</div>");
      if( gomicategory in gomi_color_obj ){
        $("#" + item_id_str).css("border-left-color", gomi_color_obj[gomicategory]);
      }else{
        $("#" + item_id_str).css("border-left-color", "#A9A9A9");
      }
      ++item_counter; 
    }

    if(result.length == 0){
      $("#result-container").append("<div class=\"not-found\"> ごみの品目が見つかりませんでした </div>");
    }

    $("#result-container").show();

  
  //$("#search-results").text(m); 
};



$(function(){

  var prev_timer_id = -1;  
  var fuse;
  const options = {
    includeScore: true,
    keys: ["gominame" ,"aux"],
    threshold: fuzzy_search_threshold,
    useExtendedSearch: true
  }
  

  var gomidb = [];
  csvToArray("data/target.csv", function(data) {
    // target.csv 読み込み完了時
    data.shift();
    data.forEach( elem => { 
      var gomi_item = {
        "gominame" : elem[1],
        "gomicategory" : elem[0],
        "gomiremark" : elem[2]
      };
      gomidb.push(gomi_item);
    });

    // 類語DBを作成
    var similar_words_obj = {};
    
    gomidict.forEach((elem, index) => {
      elem.forEach((elem_c, index_c) => {
        similar_words_obj[elem_c] = index;
      });
    });

    gomidb.forEach((elem, index) => {
      if(elem.gominame in similar_words_obj){
        gomidb[index]["aux"] = gomidict[ similar_words_obj[elem.gominame] ];
      }
    });

        
    fuse = new Fuse(gomidb, options);
    search_func_state = 1;

    
  });


  csvToArray("data/description.csv", function(data) {
    // description.csv 読み込み完了時
    data.shift();
    data.forEach( elem => { 
      var category_item = {
        "category_label" : elem[0],
        "color_code" : elem[4]
      };
      
      var color_code_validator = category_item.color_code.match(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);

      if(category_item.category_label != "" && color_code_validator != null){
        gomi_color_obj[category_item.category_label] = category_item.color_code;
      }
    });
  });

    
  
  $("#search-box").on("input", function() {
    if(prev_timer_id != -1){
      clearTimeout(prev_timer_id);
    }
    prev_timer_id = setTimeout(function(){ search_and_show(fuse); }, 750);
  });

  $("#search-box").keypress(function(e){
    if(e.which == 13){
      search_and_show(fuse);
    }
  });

  $("#search-icon").on("click", function(e){
    search_and_show(fuse);
  });

  $("#back-icon-link").on("click", function() {
    $("#search-box").val("");
    search_and_show(fuse);
    return;
  });

});